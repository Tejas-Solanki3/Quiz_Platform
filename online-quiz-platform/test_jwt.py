from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token, decode_token
import json

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'super-secret-key-development-32bytes-long'
jwt = JWTManager(app)

with app.app_context():
    identity_str = json.dumps({"id": "123", "role": "Admin", "name": "Test"})
    try:
        token = create_access_token(identity=identity_str)
        print("Token created successfully.")
        decoded = decode_token(token)
        print("Decoded subject type:", type(decoded['sub']))
        print("Decoded subject:", decoded['sub'])
    except Exception as e:
        print("Error creating token:", str(e))
