from backend.app.db.session import SessionLocal
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.services import user_service
from backend.app.models.user import Role, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_STR}/auth/login")


def get_db() :
    db = SessionLocal()
    try:
        yield db
    finally :
        db.close()


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) :
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les informations d'identification",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception
    
    user = user_service.get_user_by_email(db, email)

    if user is None:
        raise credentials_exception

    return user



def get_current_active_admin(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) :
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Accès refusé : privilèges d'administrateur requis")
    return current_user