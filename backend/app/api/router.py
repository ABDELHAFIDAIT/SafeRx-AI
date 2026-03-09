from fastapi import APIRouter
from backend.app.api.endpoints import auth, account


router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(account.router, prefix="/account", tags=["account"])