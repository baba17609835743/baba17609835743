from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# 存储在线用户信息
users = {}
# 聊天室名称
ROOM_NAME = 'chat_room'

def load_config():
    """加载配置文件"""
    if os.path.exists('config.json'):
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'servers': ['http://localhost:5000']}

@app.route('/')
def login():
    """登录页面"""
    config = load_config()
    return render_template('login.html', servers=config.get('servers', []))

@app.route('/chat')
def chat():
    """聊天室页面"""
    username = request.args.get('username')
    server = request.args.get('server', 'http://localhost:5000')
    if not username:
        config = load_config()
        return render_template('login.html', servers=config.get('servers', []))
    return render_template('chat.html', username=username, server=server)

@app.route('/check_username', methods=['POST'])
def check_username():
    """检查用户名是否已存在"""
    username = request.json.get('username')
    return jsonify({'available': username not in users})

@socketio.on('connect')
def handle_connect():
    """处理新连接"""
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """处理断开连接"""
    sid = request.sid
    username_to_remove = None
    
    # 查找并确定要移除的用户名
    for username, user_sid in users.items():
        if user_sid == sid:
            username_to_remove = username
            break
    
    # 如果找到用户，执行移除操作
    if username_to_remove:
        # 从用户字典中移除
        del users[username_to_remove]
        
        # 通知其他用户有用户离开
        emit('user_left', {
            'username': username_to_remove, 
            'users': list(users.keys())
        }, room=ROOM_NAME, broadcast=True)
        
        # 确保用户离开房间
        leave_room(ROOM_NAME)
        
        print(f'{username_to_remove} disconnected')
    else:
        print(f'Unknown client disconnected with sid: {sid}')

@socketio.on('join')
def handle_join(data):
    """处理用户加入聊天室"""
    username = data['username']
    if username in users:
        emit('join_error', {'message': '用户名已存在'})
        return
    
    # 存储用户信息
    users[username] = request.sid
    join_room(ROOM_NAME)
    
    # 通知用户加入成功
    emit('join_success', {'username': username, 'users': list(users.keys())})
    # 通知其他用户有新用户加入
    emit('user_joined', {'username': username, 'users': list(users.keys())},
         room=ROOM_NAME, broadcast=True, include_self=False)
    
    print(f'{username} joined the room')

@socketio.on('send_message')
def handle_message(data):
    """处理发送消息"""
    username = data['username']
    message = data['message']
    
    # 处理@命令
    if message.startswith('@'):
        parts = message.split(' ', 1)
        if len(parts) > 1 and parts[0] == '@电影':
            try:
                # 电影命令处理 - 只保留原始链接
                movie_url = parts[1].strip()
                
                # 确保URL有协议头
                if not movie_url.startswith(('http://', 'https://')):
                    movie_url = 'https://' + movie_url
                
                emit('movie_request', {
                    'username': username, 
                    'original_url': movie_url,
                    'parsed_url': movie_url  # 使用原始URL作为解析URL
                }, room=ROOM_NAME, broadcast=True)
            except Exception as e:
                print(f'处理电影命令时出错: {e}')
                emit('new_message', {
                    'username': '系统',
                    'message': '处理电影请求时出错',
                    'time': '当前时间'
                }, room=request.sid)
            return
        elif len(parts) > 1 and parts[0] == '@川小农':
            try:
                # 提取问题内容
                question = parts[1].strip() if len(parts) > 1 else ''
                
                if not question:
                    emit('new_message', {
                        'username': '系统',
                        'message': '请输入您想咨询的问题',
                        'time': '当前时间'
                    }, room=request.sid)
                    return
                
                # 模拟AI回复
                import random
                ai_responses = [
                    f"您好！关于'{question}'，我的理解是...",
                    f"感谢您的问题！关于'{question}'，我认为...",
                    f"很高兴为您解答！'{question}'是一个很好的话题，...",
                    f"关于'{question}'，我可以提供一些见解...",
                    f"您的问题很有意思！关于'{question}'，我想分享..."
                ]
                
                # 根据不同的问题类型生成不同的回复
                if any(keyword in question for keyword in ['你好', '嗨', 'hello', 'hi']):
                    ai_response = f"你好！我是川小农AI，很高兴为你服务。请问有什么可以帮助你的？"
                elif any(keyword in question for keyword in ['谢谢', '感谢']):
                    ai_response = "不客气！有任何问题随时问我。"
                elif any(keyword in question for keyword in ['再见', '拜拜']):
                    ai_response = "再见！祝您有愉快的一天！"
                else:
                    ai_response = random.choice(ai_responses)
                
                # 广播AI回复
                emit('ai_request', {'username': username, 'query': question},
                     room=ROOM_NAME, broadcast=True)
                emit('ai_response', {
                    'username': '川小农',
                    'message': ai_response,
                    'time': '当前时间'
                }, room=ROOM_NAME, broadcast=True)
            except Exception as e:
                print(f'处理AI对话时出错: {e}')
                emit('new_message', {
                    'username': '系统',
                    'message': '处理AI对话时出错',
                    'time': '当前时间'
                }, room=request.sid)
            return
    
    # 发送普通消息
    emit('new_message', {
        'username': username,
        'message': message,
        'time': '当前时间'
    }, room=ROOM_NAME, broadcast=True)

if __name__ == '__main__':
    print("Starting server...")
    try:
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print("Error starting server:", str(e))