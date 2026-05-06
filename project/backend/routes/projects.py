from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from auth import get_current_user
from models import Project
from schemas import ProjectListItem, ProjectOut


router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectListItem])
async def list_projects(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ProjectListItem]:
    res = await session.execute(select(Project).order_by(Project.id.desc()))
    projects = list(res.scalars().all())
    return [
        ProjectListItem(
            id=p.id,
            title=p.title,
            description=p.description,
            is_active=bool(p.is_active),
        )
        for p in projects
    ]


@router.get("/active", response_model=ProjectOut)
async def get_active_project(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectOut:
    stmt = select(Project).where(Project.is_active.is_(True)).limit(1)
    res = await session.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active project")
    return ProjectOut(id=project.id, title=project.title, description=project.description)

