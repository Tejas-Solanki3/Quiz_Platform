from flask import Flask, render_template, jsonify
from flask_limiter.errors import RateLimitExceeded
# pyrefly: ignore [missing-import]
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from dotenv import load_dotenv
import os

from routes.auth import auth_bp
from routes.quiz import quiz_bp
from routes.attempt import attempt_bp
from routes.live import live_bp, init_socketio

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-secret')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'default-jwt-secret')
app.config['JWT_TOKEN_LOCATION'] = ['headers']

import time

@app.context_processor
def inject_cache_version():
    return dict(CACHE_VERSION=str(int(time.time())))

from extensions import limiter

jwt = JWTManager(app)
limiter.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize socketio in live blueprint
init_socketio(socketio)

@app.errorhandler(RateLimitExceeded)
def ratelimit_handler(e):
    return jsonify({"error": "rate_limit_exceeded", "message": str(e.description)}), 429

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(quiz_bp, url_prefix='/api')
app.register_blueprint(attempt_bp, url_prefix='/api')
app.register_blueprint(live_bp, url_prefix='/api/live')

# Frontend Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/create_quiz')
def create_quiz_page():
    return render_template('create_quiz.html')

@app.route('/quiz/<quiz_id>')
def quiz_page(quiz_id):
    return render_template('quiz.html', quiz_id=quiz_id)

@app.route('/live_quiz/<room_code>')
def live_quiz_page(room_code):
    return render_template('live_quiz.html', room_code=room_code)

@app.route('/leaderboard/<room_code>')
def leaderboard_page(room_code):
    return render_template('leaderboard.html', room_code=room_code)

@app.route('/results/<attempt_id>')
def results_page(attempt_id):
    return render_template('results.html', attempt_id=attempt_id)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
