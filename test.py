# 简单的Flask测试文件
print("Starting test...")
try:
    from flask import Flask
    app = Flask(__name__)
    print("Flask imported successfully")
    
    try:
        from flask_socketio import SocketIO
        socketio = SocketIO(app)
        print("Flask-SocketIO imported successfully")
    except Exception as e:
        print("Error importing Flask-SocketIO:", str(e))
        
except Exception as e:
    print("Error importing Flask:", str(e))
    
print("Test completed")