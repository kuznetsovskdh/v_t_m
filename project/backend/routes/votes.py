from typing import Dict, List
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from auth import get_current_user
from database import get_session
from models import Criteria, Project, User, Vote
from schemas import (
    CriteriaScoreOut,
    SaveVotesResponse,
    VoteSubmit,
    VoteItem,
    VotesResponse,
    VotesStatusResponse,
    VoteStatusJudgeOut,
)
router = APIRouter(prefix="/api/votes", tags=["votes"])

async def get_active_project_or_404(session: AsyncSession) -> Project:
    res = await session.execute(select(Project).where(Project.is_active.is_(True)).limit(1))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active project")
    return project

async def get_project_or_404(session: AsyncSession, project_id: int) -> Project:
    res = await session.execute(select(Project).where(Project.id == project_id).limit(1))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project

async def get_criteria_map(session: AsyncSession) -> Dict[int, Criteria]:
    res = await session.execute(select(Criteria))
    criteria_list = list(res.scalars().all())
    return {c.id: c for c in criteria_list}

async def save_votes_for_project(
    *,
    project: Project,
    answer: str,
    votes: List[VoteItem],
    request: Request,
    current_user: User,
    session: AsyncSession,
) -> SaveVotesResponse:
    criteria_map = await get_criteria_map(session)
    if not criteria_map:
        raise HTTPException(status_code=500, detail="No criteria configured")
    expected_ids = set(criteria_map.keys())
    given_ids = {v.criteria_id for v in votes}
    if answer == "Рассмотреть" and given_ids != expected_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Must submit exactly all criteria. Expected {sorted(expected_ids)}, got {sorted(given_ids)}.",
        )
    if answer not in {"Отклонено", "Рассмотреть", "Воздержаться"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown answer")
    if answer in {"Отклонено", "Воздержаться"}:
        items_to_save = [(criteria_id, 0) for criteria_id in sorted(expected_ids)]
    else:
        items_to_save = [(item.criteria_id, item.score) for item in votes]
    saved_count = 0
    for criteria_id, score in items_to_save:
        c = criteria_map.get(criteria_id)
        if not c:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown criteria_id={criteria_id}")
        if answer == "Рассмотреть" and (score < 1 or score > c.max_score):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"score must be within [1..{c.max_score}] for criteria_id={criteria_id}",
            )
        session.add(
            Vote(
                user_id=current_user.id,
                project_id=project.id,
                criteria_id=criteria_id,
                score=score,
                answer=answer,
            )
        )
        saved_count += 1
    await session.commit()
    ws_manager = request.app.state.ws_manager
    await ws_manager.broadcast(
        project.id,
        {
            "type": "vote_submitted",
            "project_id": project.id,
            "user_id": current_user.id,
        },
    )
    criteria_count = len(criteria_map)
    jury_ids_res = await session.execute(select(User.id))
    jury_ids = list(jury_ids_res.scalars().all())
    if jury_ids:
        counts_res = await session.execute(
            select(Vote.user_id, func.count(func.distinct(Vote.criteria_id)).label("cnt"))
            .where(Vote.project_id == project.id)
            .group_by(Vote.user_id)
        )
        counts = {row.user_id: row.cnt for row in counts_res.all()}
        all_voted = all(counts.get(uid, 0) == criteria_count for uid in jury_ids)
    else:
        all_voted = False
    if all_voted and project.id not in ws_manager.voting_complete_sent:
        ws_manager.voting_complete_sent.add(project.id)
        await ws_manager.broadcast(
            project.id,
            {
                "type": "voting_complete",
                "project_id": project.id,
            },
        )
    return SaveVotesResponse(project_id=project.id, saved=saved_count)

@router.post("", response_model=SaveVotesResponse, responses={401: {"description": "Unauthorized"}})
async def submit_votes(
    request: Request,
    payload: VoteSubmit = Body(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SaveVotesResponse:
    active_project = await get_active_project_or_404(session)
    return await save_votes_for_project(
        project=active_project,
        answer=payload.answer,
        votes=payload.votes,
        request=request,
        current_user=current_user,
        session=session,
    )

@router.post("/{project_id}", response_model=SaveVotesResponse, responses={401: {"description": "Unauthorized"}})
async def submit_votes_for_project(
    project_id: int,
    request: Request,
    payload: VoteSubmit = Body(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SaveVotesResponse:
    project = await get_project_or_404(session, project_id)
    return await save_votes_for_project(
        project=project,
        answer=payload.answer,
        votes=payload.votes,
        request=request,
        current_user=current_user,
        session=session,
    )

@router.get("/{project_id}", response_model=VotesResponse)
async def get_votes(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> VotesResponse:
    criteria_res = await session.execute(select(Criteria).order_by(Criteria.id))
    criteria_list = list(criteria_res.scalars().all())
    if not criteria_list:
        raise HTTPException(status_code=500, detail="No criteria configured")
    users_res = await session.execute(select(User).order_by(User.id))
    users = list(users_res.scalars().all())
    latest_ids = (
        select(func.max(Vote.id).label("id"))
        .where(Vote.project_id == project_id)
        .group_by(Vote.user_id, Vote.criteria_id)
        .subquery()
    )
    votes_res = await session.execute(select(Vote).join(latest_ids, Vote.id == latest_ids.c.id))
    votes = list(votes_res.scalars().all())
    score_by_user: Dict[int, Dict[int, int]] = {}
    answer_by_user: Dict[int, str] = {}
    answer_by_user_criteria: Dict[int, Dict[int, str | None]] = {}
    for v in votes:
        score_by_user.setdefault(v.user_id, {})[v.criteria_id] = v.score
        answer_by_user_criteria.setdefault(v.user_id, {})[v.criteria_id] = v.answer
        if v.answer:
            answer_by_user[v.user_id] = v.answer
    judges_payload = []
    for u in users:
        scores: list[CriteriaScoreOut] = []
        for c in criteria_list:
            score = score_by_user.get(u.id, {}).get(c.id)
            answer = answer_by_user_criteria.get(u.id, {}).get(c.id)
            scores.append(CriteriaScoreOut(criteria_id=c.id, score=score, answer=answer))
        judges_payload.append(
            {
                "user_id": u.id,
                "display_name": u.display_name,
                "color": u.color,
                "answer": answer_by_user.get(u.id),
                "scores": scores,
            }
        )
    return VotesResponse(
        project_id=project_id,
        criteria=[
            {"id": c.id, "name": c.name, "max_score": c.max_score}
            for c in criteria_list
        ],
        judges=judges_payload,
    )

@router.get("/{project_id}/status", response_model=VotesStatusResponse)
async def get_votes_status(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> VotesStatusResponse:
    criteria_res = await session.execute(select(Criteria))
    criteria_list = list(criteria_res.scalars().all())
    criteria_count = len(criteria_list)
    if criteria_count == 0:
        raise HTTPException(status_code=500, detail="No criteria configured")
    users_res = await session.execute(select(User).order_by(User.id))
    users = list(users_res.scalars().all())
    counts_res = await session.execute(
        select(Vote.user_id, func.count(func.distinct(Vote.criteria_id)).label("cnt"))
        .where(Vote.project_id == project_id)
        .group_by(Vote.user_id)
    )
    counts = {row.user_id: row.cnt for row in counts_res.all()}
    judges: list[VoteStatusJudgeOut] = []
    for u in users:
        judges.append(
            VoteStatusJudgeOut(
                user_id=u.id,
                display_name=u.display_name,
                color=u.color,
                has_voted=(counts.get(u.id, 0) == criteria_count),
            )
        )
    return VotesStatusResponse(project_id=project_id, judges=judges)
