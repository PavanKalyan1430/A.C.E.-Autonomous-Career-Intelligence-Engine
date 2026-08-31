from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User, Profile
from app.schemas.user import Token, UserCreate, UserResponse, PasswordChange, ProfileResponse, ProfileUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        is_active=True,
        is_superuser=False
    )
    db.add(db_user)
    try:
        await db.commit()
        await db.refresh(db_user)

        # Automatically seed a default Profile for the new user
        default_name = user_in.email.split("@")[0].replace(".", " ").replace("_", " ").title()
        db_profile = Profile(
            user_id=db_user.id,
            full_name=default_name,
            target_role=None,
            bio="Software engineering candidate focused on backend systems and AI applications.",
            preferences={
                "difficulty": "Medium",
                "model_routing": "auto",
                "enable_agent_memory": True,
                "enable_live_search": True
            }
        )
        db.add(db_profile)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Reload user with profile
    res_full = await db.execute(
        select(User).options(selectinload(User.profile)).filter(User.id == db_user.id)
    )
    return res_full.scalars().first()

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        token_type="bearer",
    )

@router.get("/me", response_model=UserResponse)
async def read_user_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res_user = await db.execute(
        select(User).options(selectinload(User.profile)).filter(User.id == current_user.id)
    )
    user = res_user.scalars().first()
    
    # Auto-seed profile if missing for legacy accounts
    if not user.profile:
        default_name = user.email.split("@")[0].replace(".", " ").replace("_", " ").title()
        db_profile = Profile(
            user_id=user.id,
            full_name=default_name,
            target_role=None,
            bio="Software engineering candidate focused on backend systems and AI applications.",
            preferences={
                "difficulty": "Medium",
                "model_routing": "auto",
                "enable_agent_memory": True,
                "enable_live_search": True
            }
        )
        db.add(db_profile)
        await db.commit()
        res_user = await db.execute(
            select(User).options(selectinload(User.profile)).filter(User.id == user.id)
        )
        user = res_user.scalars().first()

    return user

@router.get("/profile", response_model=ProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res_prof = await db.execute(select(Profile).filter(Profile.user_id == current_user.id))
    profile = res_prof.scalars().first()
    if not profile:
        default_name = current_user.email.split("@")[0].replace(".", " ").replace("_", " ").title()
        profile = Profile(
            user_id=current_user.id,
            full_name=default_name,
            target_role=None,
            bio="Software engineering candidate focused on backend systems and AI applications.",
            preferences={
                "difficulty": "Medium",
                "model_routing": "auto",
                "enable_agent_memory": True,
                "enable_live_search": True
            }
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile

@router.put("/profile", response_model=ProfileResponse)
async def update_user_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res_prof = await db.execute(select(Profile).filter(Profile.user_id == current_user.id))
    profile = res_prof.scalars().first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    if payload.full_name is not None:
        profile.full_name = payload.full_name
    if payload.target_role is not None:
        profile.target_role = payload.target_role
    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.preferences is not None:
        merged = dict(profile.preferences or {})
        merged.update(payload.preferences)
        profile.preferences = merged

    await db.commit()
    await db.refresh(profile)
    return profile

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    await db.commit()
    return {"message": "Password updated successfully."}
