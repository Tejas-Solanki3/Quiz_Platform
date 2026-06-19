from datetime import datetime
import uuid

def create_user(name, email, password_hash, role="Student"):
    return {
        "_id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password": password_hash,
        "role": role,
        "created_at": datetime.utcnow()
    }
