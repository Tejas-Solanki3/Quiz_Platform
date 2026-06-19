from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import init_db
from models.quiz import create_quiz, create_question
import uuid
import json

quiz_bp = Blueprint('quiz', __name__)
db = init_db()

@quiz_bp.route('/quizzes', methods=['GET'])
def get_quizzes():
    # If admin, fetch all. If student, fetch only published.
    # We can also do this based on a query parameter or just return published for all GET without JWT.
    published_only = request.args.get('published', 'true').lower() == 'true'
    query = {"is_published": True} if published_only else {}
    quizzes = list(db.quizzes.find(query))
    return jsonify(quizzes), 200

@quiz_bp.route('/quizzes/<quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    quiz = db.quizzes.find_one({"_id": quiz_id})
    if not quiz:
        return jsonify({"msg": "Quiz not found"}), 404
    return jsonify(quiz), 200

@quiz_bp.route('/quizzes', methods=['POST'])
@jwt_required()
def create_quiz_endpoint():
    current_user = json.loads(get_jwt_identity())
    if current_user.get('role') != 'Admin':
        return jsonify({"msg": "Admin only"}), 403

    data = request.get_json()
    new_quiz = create_quiz(
        title=data.get('title'),
        description=data.get('description'),
        duration=data.get('duration', 10),
        created_by=current_user['id'],
        questions=data.get('questions', []),
        is_published=data.get('is_published', False)
    )
    db.quizzes.insert_one(new_quiz)
    return jsonify(new_quiz), 201

@quiz_bp.route('/quizzes/<quiz_id>', methods=['PUT'])
@jwt_required()
def update_quiz(quiz_id):
    current_user = json.loads(get_jwt_identity())
    if current_user.get('role') != 'Admin':
        return jsonify({"msg": "Admin only"}), 403
    
    data = request.get_json()
    # Simple replace for demo purposes, could be more granular
    update_data = {
        "title": data.get('title'),
        "description": data.get('description'),
        "duration": data.get('duration'),
        "is_published": data.get('is_published', False),
        "questions": data.get('questions', [])
    }
    
    result = db.quizzes.update_one({"_id": quiz_id}, {"$set": update_data})
    if result.matched_count == 0:
        return jsonify({"msg": "Quiz not found"}), 404
        
    return jsonify({"msg": "Quiz updated"}), 200

@quiz_bp.route('/quizzes/<quiz_id>', methods=['DELETE'])
@jwt_required()
def delete_quiz(quiz_id):
    current_user = json.loads(get_jwt_identity())
    if current_user.get('role') != 'Admin':
        return jsonify({"msg": "Admin only"}), 403

    result = db.quizzes.delete_one({"_id": quiz_id})
    if result.deleted_count == 0:
        return jsonify({"msg": "Quiz not found"}), 404
        
    return jsonify({"msg": "Quiz deleted"}), 200
