from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_active_admin, get_current_user
from backend.app.schemas.user import UserCreate, UserOut
from backend.app.services import user_service
from backend.app.models.user import User, Role
from backend.app.services.email_service import generate_password, send_credentials_email


router = APIRouter()

ALLOWED_ROLES = {Role.DOCTOR, Role.PHARMACIST}

@router.post("/create", response_model=UserOut)
def create_account(user_in: UserCreate, db: Session = Depends(get_db), current_admin: User =  Depends(get_current_active_admin)) :
    if user_in.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Un admin ne peut créer que des comptes : "
                   f"{', '.join(r.value for r in ALLOWED_ROLES)}.",
        )
    
    db_user = user_service.get_user_by_email(db, email=user_in.email)
    
    if db_user:
        raise HTTPException(
            status_code=400, detail="Un utilisateur avec cet email existe déjà."
        )
    
    plain_password = generate_password()
    
    user_data = user_in.model_copy(update={"password": plain_password})
    new_user = user_service.create_user(db, user_in=user_data)

    try:
        send_credentials_email(
            to_email=new_user.email,
            first_name=new_user.first_name,
            role=new_user.role.value,
            plain_password=plain_password,
        )
    except Exception as e:
        raise HTTPException(
            status_code=201,
            detail=f"Compte créé mais l'envoi de l'email a échoué : {str(e)}",
        )

    return new_user




class PasswordChange(BaseModel):
    new_password: str



@router.post("/change-password")
def change_password(
    body: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_first_login:
        raise HTTPException(status_code=400, detail="Mot de passe déjà changé.")

    user_service.update_password(db, user=current_user, new_password=body.new_password)
    return {"message": "Mot de passe mis à jour avec succès."}