from flask import Blueprint, request, jsonify
# pyrefly: ignore [missing-import]
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit, join_room, leave_room
from database.db import init_db
import uuid
import json

live_bp = Blueprint('live', __name__)
db = init_db()

# Global reference to socketio initialized in app.py
_socketio = None

def init_socketio(socketio):
    global _socketio
    _socketio = socketio
    register_socket_events(_socketio)

@live_bp.route('/create', methods=['POST'])
@jwt_required()
def create_live_session():
    current_user = json.loads(get_jwt_identity())
    if current_user.get('role') != 'Admin':
        return jsonify({"msg": "Admin only"}), 403

    data = request.get_json()
    quiz_id = data.get('quiz_id')
    room_code = str(uuid.uuid4())[:6].upper()
    
    import datetime
    session = {
        "_id": str(uuid.uuid4()),
        "room_code": room_code,
        "quiz_id": quiz_id,
        "host_id": current_user['id'],
        "participants": [],
        "status": "waiting", # waiting, active, finished
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    db.live_sessions.insert_one(session)
    return jsonify(session), 201

@live_bp.route('/history', methods=['GET'])
@jwt_required()
def get_live_history():
    import json
    current_identity = get_jwt_identity()
    current_user = json.loads(current_identity) if isinstance(current_identity, str) else current_identity
    
    if current_user['role'] not in ['Teacher', 'Admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    sessions = list(db.live_sessions.find({"host_id": current_user['id']}))
    for s in sessions:
        s['_id'] = str(s['_id'])
        quiz = db.quizzes.find_one({"_id": s['quiz_id']})
        s['quiz_title'] = quiz.get('title', 'Unknown Quiz') if quiz else 'Deleted Quiz'
            
    # Sort by created_at if it exists
    sessions.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(sessions), 200

@live_bp.route('/<room_code>', methods=['GET'])
def get_live_session(room_code):
    session = db.live_sessions.find_one({"room_code": room_code})
    if not session:
        return jsonify({"msg": "Session not found"}), 404
        
    quiz = db.quizzes.find_one({"_id": session['quiz_id']})
    # Remove correct answers before sending to client
    if quiz and 'questions' in quiz:
        for q in quiz['questions']:
            q.pop('correct_answer', None)
    
    session['quiz'] = quiz
    return jsonify(session), 200

# Socket.io Event Handlers
def register_socket_events(socketio):
    
    @socketio.on('join')
    def on_join(data):
        room = data['room']
        username = data['username']
        is_host = data.get('is_host', False)
        join_room(room)
        
        # Add to DB
        session = db.live_sessions.find_one({"room_code": room})
        if session and not is_host:
            # check if participant already exists
            participant = next((p for p in session['participants'] if p['name'] == username), None)
            if not participant:
                new_participant = {"name": username, "score": 0}
                db.live_sessions.update_one({"room_code": room}, {"$push": {"participants": new_participant}})
                
        emit('user_joined', {'username': username}, to=room)
        # Send updated leaderboard
        updated_session = db.live_sessions.find_one({"room_code": room})
        emit('update_leaderboard', {'participants': updated_session.get('participants', [])}, to=room)

    @socketio.on('start_quiz')
    def on_start_quiz(data):
        room = data['room']
        db.live_sessions.update_one({"room_code": room}, {"$set": {"status": "active"}})
        
        # Fetch first question
        session = db.live_sessions.find_one({"room_code": room})
        quiz = db.quizzes.find_one({"_id": session['quiz_id']})
        if quiz and 'questions' in quiz and len(quiz['questions']) > 0:
            q = quiz['questions'][0].copy()
            q.pop('correct_answer', None)
            emit('new_question', {'question_index': 0, 'question': q}, to=room)
        else:
            emit('quiz_finished', {'leaderboard': session.get('participants', [])}, to=room)

    @socketio.on('next_question')
    def on_next_question(data):
        room = data['room']
        question_index = data.get('question_index', 0)
        
        session = db.live_sessions.find_one({"room_code": room})
        quiz = db.quizzes.find_one({"_id": session['quiz_id']})
        
        if quiz and 'questions' in quiz and question_index < len(quiz['questions']):
            q = quiz['questions'][question_index].copy()
            q.pop('correct_answer', None)
            emit('new_question', {'question_index': question_index, 'question': q}, to=room)
        else:
            participants = session.get('participants', [])
            participants.sort(key=lambda x: x.get('score', 0), reverse=True)
            db.live_sessions.update_one({"room_code": room}, {"$set": {"status": "finished"}})
            emit('quiz_finished', {'leaderboard': participants}, to=room)

    @socketio.on('submit_answer')
    def on_submit_answer(data):
        room = data['room']
        username = data['username']
        answer = data.get('answer')
        q_idx = data.get('question_index', 0)
        time_taken = data.get('time_taken', 0)
        
        session = db.live_sessions.find_one({"room_code": room})
        if not session: return
        quiz = db.quizzes.find_one({"_id": session['quiz_id']})
        
        if quiz and 'questions' in quiz and q_idx < len(quiz['questions']):
            correct_ans = quiz['questions'][q_idx].get('correct_answer')
            if answer == correct_ans:
                # Give points, more points for faster answers (e.g., max 1000)
                score_add = max(100, 1000 - (time_taken * 10))
                db.live_sessions.update_one(
                    {"room_code": room, "participants.name": username},
                    {"$inc": {"participants.$.score": score_add}}
                )
                
        updated_session = db.live_sessions.find_one({"room_code": room})
        emit('update_leaderboard', {'participants': updated_session.get('participants', [])}, to=room)
        
    @socketio.on('show_results')
    def on_show_results(data):
        room = data['room']
        session = db.live_sessions.find_one({"room_code": room})
        participants = session.get('participants', [])
        participants.sort(key=lambda x: x.get('score', 0), reverse=True)
        emit('show_results', {'leaderboard': participants}, to=room)
