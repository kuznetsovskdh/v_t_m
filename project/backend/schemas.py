from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    color: str


class ProjectOut(BaseModel):
    id: int
    title: str
    description: str


class ProjectListItem(BaseModel):
    id: int
    title: str
    description: str
    is_active: bool


class CriteriaOut(BaseModel):
    id: int
    name: str
    max_score: int = 5


class VoteItem(BaseModel):
    criteria_id: int
    score: int = Field(ge=1, le=5)


class SaveVotesResponse(BaseModel):
    project_id: int
    saved: int


class CriteriaScoreOut(BaseModel):
    criteria_id: int
    score: Optional[int] = None


class JudgeVotesOut(BaseModel):
    user_id: int
    display_name: str
    color: str
    scores: list[CriteriaScoreOut]


class VotesResponse(BaseModel):
    project_id: int
    criteria: list[CriteriaOut]
    judges: list[JudgeVotesOut]


class VoteStatusJudgeOut(BaseModel):
    user_id: int
    display_name: str
    color: str
    has_voted: bool


class VotesStatusResponse(BaseModel):
    project_id: int
    judges: list[VoteStatusJudgeOut]


class ErrorResponse(BaseModel):
    detail: str

