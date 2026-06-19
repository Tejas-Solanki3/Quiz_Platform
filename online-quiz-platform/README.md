# Kahoot-Inspired Online Quiz Platform

This is a full-stack, Kahoot-inspired online quiz platform built for a college-level System Design evaluation.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS3 (Kahoot-inspired styling), Vanilla JavaScript
- **Backend**: Python, Flask, Flask-JWT-Extended, Flask-SocketIO
- **Database**: MongoDB (PyMongo)
- **Authentication**: JWT & bcrypt

## Features
- **Admin Dashboard**: Manage users, create quizzes, manage questions, and launch live quiz sessions.
- **Student Dashboard**: Take available quizzes, view past attempt history and scores.
- **Live Quiz Mode**: Start a live quiz session (Socket.io), display a PIN code, and let students join. Live leaderboard updates as users answer questions.
- **Kahoot-style UI**: Bright colors, big buttons, bold typography, simple animations, and responsive layout.

## Database Design
Refer to `docs/er_diagram.md` for the Mermaid ER diagram.
Collections used: `users`, `quizzes`, `attempts`, `live_sessions`.

## Architecture
Refer to `docs/architecture.md` for the System Architecture diagram.

## API Documentation
The application exposes a set of REST endpoints grouped by blueprints.

### Authentication (`/api`)
- `POST /api/register` - Register a new user (Student or Admin).
- `POST /api/login` - Authenticate and return a JWT access token.

### Quizzes (`/api`)
- `GET /api/quizzes` - Fetch quizzes.
- `GET /api/quizzes/<id>` - Fetch a single quiz.
- `POST /api/quizzes` - Create a quiz (Admin only).
- `PUT /api/quizzes/<id>` - Update a quiz (Admin only).
- `DELETE /api/quizzes/<id>` - Delete a quiz (Admin only).

### Attempts/Results (`/api`)
- `POST /api/attempt/submit` - Submit quiz answers and calculate score.
- `GET /api/results` - Get attempt history for the logged-in user.
- `GET /api/results/<id>` - Get specific attempt details.

### Live Quiz (`/api/live`)
- `POST /api/live/create` - Create a new Socket.io session (Admin only).
- `GET /api/live/<room_code>` - Fetch live session details.

## Setup Instructions

### Prerequisites
1. **Python 3.8+**
2. **MongoDB** installed locally (or access to an Atlas cluster).

### Steps to Run Locally

1. **Clone/Unzip the project** and navigate into the `online-quiz-platform` directory.
   ```bash
   cd online-quiz-platform
   ```

2. **Create a virtual environment** (optional but recommended)
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
   - Make sure your MongoDB is running on `mongodb://localhost:27017/online_quiz_db` or update `MONGO_URI` in `.env`.

5. **Seed the Database** (Creates a sample Admin, Student, and Quiz)
   ```bash
   python -m models.seed
   ```
   *Sample Logins:*
   - Admin: `admin@example.com` / `admin123`
   - Student: `student@example.com` / `student123`

6. **Run the Application**
   ```bash
   python app.py
   ```
   The app will run on `http://localhost:5000` by default.

## Future Scope
- **Rich Media**: Support for images and videos in quiz questions.
- **Multiple Question Types**: Add support for True/False, fill in the blank, or multi-select answers.
- **Advanced Leaderboards**: Implement global site-wide leaderboards.
- **Exporting Results**: Allow admins to export quiz results to CSV/Excel.
- **Timer per Question**: In the Live Quiz, enforce a strict timer per question managed by the server.
