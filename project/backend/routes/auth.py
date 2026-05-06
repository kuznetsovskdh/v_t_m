from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import create_access_token, get_current_user, verify_password
from database import get_session
from models import User
from schemas import ErrorResponse, LoginRequest, TokenResponse, UserOut


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse, responses={401: {"model": ErrorResponse}})
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)) -> TokenResponse:
    stmt = select(User).where(User.username == payload.username)
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(user_id=user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        color=current_user.color,
    )

