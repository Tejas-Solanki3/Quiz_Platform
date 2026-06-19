from datetime import datetime
import uuid

def create_quiz(title, description, duration, created_by, questions=None, is_published=False):
    if questions is None:
        questions = []
    return {
        "_id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "duration": duration,
        "created_by": created_by,
        "is_published": is_published,
        "questions": questions,
        "created_at": datetime.utcnow()
    }

def create_question(question_text, options, correct_answer):
    return {
        "question_text": question_text,
        "options": options,
        "correct_answer": correct_answer
    }
