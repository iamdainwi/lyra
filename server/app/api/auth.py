import jwt
import base64
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session
import uuid

from app.core.config import settings
from app.database.client import get_session
from app.database.models import User

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    token_query: str = Query(None, alias="token"),
    db: Session = Depends(get_session)
) -> User:
    token = credentials.credentials if credentials else token_query
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        print(f"--- DEBUG TOKEN ---")
        try:
            print(f"Header: {jwt.get_unverified_header(token)}")
            print(f"Payload: {jwt.decode(token, options={'verify_signature': False})}")
        except Exception as e:
            print(f"Decode error: {e}")
        print(f"-------------------")
        # Peek at the token header to check the algorithm
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
        
        if settings.supabase_jwt_secret and alg == "HS256":
            # Supabase JWT secret is base64-encoded — decode to raw bytes first
            try:
                secret_bytes = base64.b64decode(settings.supabase_jwt_secret + "==")
            except Exception:
                secret_bytes = settings.supabase_jwt_secret.encode()
            payload = jwt.decode(
                token,
                secret_bytes,
                algorithms=["HS256"],
                audience="authenticated"
            )
        else:
            # For development, if no secret is provided OR if Supabase is using RS256 
            # (which requires fetching JWKS from the Supabase project URL), 
            # we decode without verification to unblock local development.
            payload = jwt.decode(token, options={"verify_signature": False})
            
        user_id_str = payload.get("sub")
        email = payload.get("email")
        user_metadata = payload.get("user_metadata", {})
        name = user_metadata.get("name") or user_metadata.get("full_name")
        
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
            
        user_id = uuid.UUID(user_id_str)
        
        # Upsert user in database
        user = db.get(User, user_id)
        if not user:
            user = User(id=user_id, email=email or f"{user_id_str}@unknown.com", name=name)
            db.add(user)
            db.commit()
            db.refresh(user)
        elif name and user.name != name:
            user.name = name
            db.commit()
            db.refresh(user)
            
        return user
        
    except jwt.ExpiredSignatureError:
        print("Auth failed: Token has expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        print(f"Auth failed: Invalid token - {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except ValueError as e:
        print(f"Auth failed: Value error - {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid subject UUID in token")
