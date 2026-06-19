from datetime import datetime
import uuid

def create_attempt(user_id, quiz_id, score, percentage, answers):
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "quiz_id": quiz_id,
        "score": score,
        "percentage": percentage,
        "answers": answers,
        "submitted_at": datetime.utcnow()
    }
