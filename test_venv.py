# 测试虚拟环境中的Flask和Flask-SocketIO
print("Testing virtual environment...")
try:
    # 导入Flask
    from flask import Flask
    app = Flask(__name__)
    print("✅ Flask imported successfully")
    
    # 导入Flask-SocketIO
    from flask_socketio import SocketIO
    socketio = SocketIO(app)
    print("✅ Flask-SocketIO imported successfully")
    
    # 打印Python版本和环境信息
    import sys
    print(f"Python version: {sys.version}")
    print(f"Virtual environment path: {sys.prefix}")
    print("✅ Virtual environment is working correctly!")
    
except ImportError as e:
    print(f"❌ Import error: {str(e)}")
except Exception as e:
    print(f"❌ Error: {str(e)}")