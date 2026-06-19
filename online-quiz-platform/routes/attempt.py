from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import init_db
from models.attempt import create_attempt
import json

attempt_bp = Blueprint('attempt', __name__)
db = init_db()

@attempt_bp.route('/attempt/submit', methods=['POST'])
@jwt_required()
def submit_attempt():
    current_user = json.loads(get_jwt_identity())
    data = request.get_json()
    quiz_id = data.get('quiz_id')
    user_answers = data.get('answers') # List of {question_index: answer_string} or just ordered list of answers

    quiz = db.quizzes.find_one({"_id": quiz_id})
    if not quiz:
        return jsonify({"msg": "Quiz not found"}), 404

    correct_count = 0
    total_questions = len(quiz.get('questions', []))
    
    for idx, q in enumerate(quiz.get('questions', [])):
        if str(idx) in user_answers or idx in user_answers:
            ans = user_answers.get(str(idx)) or user_answers.get(idx)
            if ans == q.get('correct_answer'):
                correct_count += 1
                
    percentage = (correct_count / total_questions) * 100 if total_questions > 0 else 0
    
    new_attempt = create_attempt(
        user_id=current_user['id'],
        quiz_id=quiz_id,
        score=correct_count,
        percentage=percentage,
        answers=user_answers
    )
    
    db.attempts.insert_one(new_attempt)
    return jsonify(new_attempt), 201

@attempt_bp.route('/results', methods=['GET'])
@jwt_required()
def get_results():
    current_user = json.loads(get_jwt_identity())
    # If admin, all attempts. If student, only their attempts
    if current_user.get('role') == 'Admin':
        attempts = list(db.attempts.find())
    else:
        attempts = list(db.attempts.find({"user_id": current_user['id']}))
        
    return jsonify(attempts), 200

@attempt_bp.route('/results/<attempt_id>', methods=['GET'])
@jwt_required()
def get_result(attempt_id):
    current_user = json.loads(get_jwt_identity())
    attempt = db.attempts.find_one({"_id": attempt_id})
    if not attempt:
        return jsonify({"msg": "Attempt not found"}), 404
        
    if current_user.get('role') != 'Admin' and attempt['user_id'] != current_user['id']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    # Also fetch the quiz details to show questions
    quiz = db.quizzes.find_one({"_id": attempt['quiz_id']})
    attempt['quiz'] = quiz
    return jsonify(attempt), 200
