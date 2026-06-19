from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
from database.db import init_db
from models.user import create_user
import datetime
import json

from extensions import limiter

auth_bp = Blueprint('auth', __name__)
db = init_db()

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'Student')

    if not name or not email or not password:
        return jsonify({"msg": "Missing fields"}), 400

    if db.users.find_one({"email": email}):
        return jsonify({"msg": "Email already registered"}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    new_user = create_user(name, email, hashed_password.decode('utf-8'), role)
    
    db.users.insert_one(new_user)
    return jsonify({"msg": "User created successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"msg": "Bad email or password"}), 401

    if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        expires = datetime.timedelta(days=1)
        access_token = create_access_token(identity=json.dumps({"id": user["_id"], "role": user["role"], "name": user["name"]}), expires_delta=expires)
        return jsonify(access_token=access_token, user={"id": user["_id"], "name": user["name"], "role": user["role"]}), 200
    
    return jsonify({"msg": "Bad email or password"}), 401

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    current_user = json.loads(get_jwt_identity())
    return jsonify(current_user), 200
