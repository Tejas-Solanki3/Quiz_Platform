from pymongo import MongoClient
import os

def init_db():
    uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/online_quiz_db')
    client = MongoClient(uri)
    try:
        db = client.get_database()
    except Exception:
        # If the URI doesn't specify a database, default to online_quiz_db
        db = client.get_database('online_quiz_db')
    return db
