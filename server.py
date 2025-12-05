from flask import Flask, render_template, request, jsonify, send_from_directory, Response
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import json
import requests
import urllib.parse
from datetime import datetime
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# 存储在线用户信息
users = {}
# 聊天室名称
ROOM_NAME = 'chat_room'
# AI配置信息
ai_config = {
    "name": "雨姐",
    "fallback_responses": ["砰砰砰", "娜艺那", "嗨娜娜，你卡了"],
    "special_responses": {
        "@雨姐": "收到消息啦！"
    }
}
# 天气API配置
WEATHER_API_KEY = "a94c22a120460d13d91d91c136c1723d"
WEATHER_API_URL = "https://restapi.amap.com/v3/weather/weatherInfo"

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

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/proxy-health')
def proxy_health():
    """代理服务健康检查端点"""
    try:
        return jsonify({
            'status': 'ok',
            'message': '代理服务运行正常',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'代理服务异常: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/proxy-video')
def proxy_video():
    """视频代理路由，解决跨域问题"""
    try:
        # 获取原始视频URL参数
        original_url = request.args.get('url')
        if not original_url:
            return jsonify({'error': '缺少视频URL参数'}), 400
        
        # 解析URL以确保正确性
        parsed_url = urllib.parse.urlparse(original_url)
        if not parsed_url.scheme:
            original_url = 'https://' + original_url
        
        # 发送请求获取视频内容
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # 禁用SSL验证（仅用于开发环境）
        response = requests.get(original_url, stream=True, headers=headers, verify=False)
        
        # 提取内容类型
        content_type = response.headers.get('content-type', 'video/mp4')
        
        # 创建流式响应
        def generate():
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk
        
        # 返回响应，设置适当的CORS头
        return Response(
            generate(),
            content_type=content_type,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Length': response.headers.get('content-length'),
                'Accept-Ranges': response.headers.get('accept-ranges', 'bytes')
            }
        )
    except requests.exceptions.RequestException as e:
        print(f'代理请求失败: {e}')
        return jsonify({'error': f'代理请求失败: {str(e)}'}), 500
    except Exception as e:
        print(f'代理处理错误: {e}')
        return jsonify({'error': f'代理处理错误: {str(e)}'}), 500

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

def handle_weather_command(city):
    """处理天气查询命令"""
    try:
        # 调用高德天气API
        params = {
            'key': WEATHER_API_KEY,
            'city': city,
            'extensions': 'base',
            'output': 'JSON'
        }
        response = requests.get(WEATHER_API_URL, params=params)
        data = response.json()
        
        if data['status'] == '1' and data['count'] == '1':
            weather_info = data['lives'][0]
            return {
                'success': True,
                'city': weather_info['city'],
                'temperature': weather_info['temperature'],
                'weather': weather_info['weather'],
                'humidity': weather_info['humidity'],
                'winddirection': weather_info['winddirection'],
                'windpower': weather_info['windpower'],
                'reporttime': weather_info['reporttime']
            }
        else:
            return {'success': False, 'message': '未找到该城市的天气信息'}
    except Exception as e:
        print(f'天气查询错误: {e}')
        return {'success': False, 'message': '天气查询失败，请稍后重试'}

def handle_ai_command(username, command):
    """处理AI对话命令"""
    # 检查是否是特殊指令
    if command in ai_config['special_responses']:
        return ai_config['special_responses'][command]
    
    # 否则返回随机响应
    return random.choice(ai_config['fallback_responses'])

def handle_movie_command(url):
    """处理电影播放命令"""
    # 使用jx.m3u8.tv解析服务
    parsed_url = f'https://jx.m3u8.tv/jiexi/?url={urllib.parse.quote(url)}'
    return {
        'original_url': url,
        'parsed_url': parsed_url,
        'has_proxy': True,
        'proxy_type': 'external'
    }

@socketio.on('send_message')
def handle_message(data):
    """处理用户发送的消息"""
    username = data.get('username')
    message = data.get('message', '')
    
    # 处理@用户的消息
    if '@' in message:
        # 简单的@用户处理
        for user in users:
            if f'@{user}' in message:
                message = message.replace(f'@{user}', f'<span class="at-mention">@{user}</span>')
    
    # 处理天气命令
    if message.startswith('@天气'):
        parts = message.split(' ', 1)
        if len(parts) > 1:
            city = parts[1].strip()
            weather_result = handle_weather_command(city)
            
            if weather_result['success']:
                weather_info = weather_result
                weather_message = f"{weather_info['city']}天气：{weather_info['weather']}，温度{weather_info['temperature']}℃，湿度{weather_info['humidity']}%，{weather_info['winddirection']}{weather_info['windpower']}级"
                emit('new_message', {
                    'username': '系统',
                    'message': weather_message,
                    'weather_data': weather_info
                }, room=ROOM_NAME)
            else:
                emit('new_message', {
                    'username': '系统',
                    'message': weather_result['message']
                }, room=ROOM_NAME)
            return
    
    # 处理电影命令
    if message.startswith('@电影'):
        parts = message.split(' ', 1)
        if len(parts) > 1:
            movie_url = parts[1].strip()
            movie_info = handle_movie_command(movie_url)
            
            # 广播电影消息
            emit('movie_request', {
                'username': username,
                'original_url': movie_info['original_url'],
                'parsed_url': movie_info['parsed_url'],
                'has_proxy': movie_info['has_proxy'],
                'proxy_type': movie_info['proxy_type']
            }, room=ROOM_NAME)
            return
    
    # 处理AI命令
    if message.startswith('@雨姐'):
        ai_response = handle_ai_command(username, '@雨姐')
        
        # 广播AI请求和响应
        emit('ai_request', {
            'username': username,
            'query': message[3:].strip()
        }, room=ROOM_NAME)
        
        # 模拟AI思考延迟
        socketio.sleep(1)
        
        emit('ai_response', {
            'username': '雨姐',
            'message': ai_response
        }, room=ROOM_NAME)
        return
    
    # 处理音乐命令
    if message.startswith('@音乐'):
        # 简单的音乐命令处理，实际应用中可以更复杂
        emit('new_message', {
            'username': '系统',
            'message': '音乐功能已触发，你可以分享音乐链接或使用音乐播放器'
        }, room=ROOM_NAME)
        return
    
    # 广播普通消息
    emit('new_message', {
        'username': username,
        'message': message
    }, room=ROOM_NAME)

if __name__ == '__main__':
    print("Starting server...")
    try:
        socketio.run(app, host='0.0.0.0', port=5001, debug=True)
    except Exception as e:
        print("Error starting server:", str(e))