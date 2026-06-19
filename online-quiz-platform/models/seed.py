import os
import bcrypt
from database.db import init_db
from models.user import create_user
from models.quiz import create_quiz, create_question
from dotenv import load_dotenv

load_dotenv()

def seed_database():
    db = init_db()
    
    # Check if we already have users
    if db.users.count_documents({}) > 0:
        print("Database already seeded!")
        return

    print("Seeding database...")
    
    # 1. Create Admin
    admin_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
    admin_user = create_user("Admin User", "admin@example.com", admin_password.decode('utf-8'), role="Admin")
    db.users.insert_one(admin_user)
    
    # 2. Create Student
    student_password = bcrypt.hashpw("student123".encode('utf-8'), bcrypt.gensalt())
    student_user = create_user("Student One", "student@example.com", student_password.decode('utf-8'), role="Student")
    db.users.insert_one(student_user)

    # 3. Create sample quiz
    q1 = create_question("What does HTML stand for?", ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hyper Tool Markup Language"], "Hyper Text Markup Language")
    q2 = create_question("Which programming language is known as the language of the web?", ["Python", "C++", "JavaScript", "Java"], "JavaScript")
    q3 = create_question("What does CSS stand for?", ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"], "Cascading Style Sheets")
    
    sample_quiz = create_quiz(
        title="Web Development Basics",
        description="A simple quiz to test your web dev knowledge.",
        duration=5, # 5 minutes
        created_by=admin_user["_id"],
        questions=[q1, q2, q3],
        is_published=True
    )
    db.quizzes.insert_one(sample_quiz)
    
    print("Seeding complete! Admin: admin@example.com / admin123 | Student: student@example.com / student123")

if __name__ == "__main__":
    seed_database()
