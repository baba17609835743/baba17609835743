document.addEventListener('DOMContentLoaded', function() {
    // 获取URL中的参数
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    const server = urlParams.get('server');
    
    if (!username) {
        window.location.href = '/';
        return;
    }
    
    // DOM元素
    const messageArea = document.getElementById('messageArea');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const logoutButton = document.getElementById('logout-btn');
    const userList = document.getElementById('userList');
    const emojiButton = document.getElementById('emojiButton');
    const emojiPicker = document.getElementById('emojiPicker');
    
    // 初始化Socket.IO连接
    const socket = server ? io(server) : io();
    
    // 加入聊天室
    socket.emit('join', { username: username });
    
    // 生成当前时间
    function getCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // 添加消息到消息区域
    function addMessage(username, message, isSelf = false, isAI = false, movieInfo = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSelf ? 'self' : isAI ? 'ai' : 'other'}`;
        
        // 处理@用户的消息
        let formattedMessage = message.replace(/@(\S+)/g, function(match, user) {
            return `<span class="at-mention">${match}</span>`;
        });
        
        // 转义HTML特殊字符，防止XSS攻击
        formattedMessage = formattedMessage
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/@(\S+)/g, function(match, user) {
                return `<span class="at-mention">${match}</span>`;
            });
        
        const time = getCurrentTime();
        
        let messageHtml = '';
        if (isSelf) {
            messageHtml = `
                <div class="message-header">
                    <span>我</span>
                    <span>${time}</span>
                </div>
                <div class="message-content">${formattedMessage}</div>
            `;
        } else if (isAI) {
            messageHtml = `
                <div class="message-header">
                    <span>${username}</span>
                    <span>${time}</span>
                </div>
                <div class="message-content">${formattedMessage}</div>
            `;
        } else {
            messageHtml = `
                <div class="message-header">
                    <span>${username}</span>
                    <span>${time}</span>
                </div>
                <div class="message-content">${formattedMessage}</div>
            `;
        }
        
        // 如果包含电影信息，添加iframe播放器
        if (movieInfo) {
            // 确保原始链接有正确的协议头
            let originalUrl = movieInfo.original_url;
            if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
                originalUrl = 'https://' + originalUrl;
            }
            
            messageHtml += `
                <div class="movie-player-container">
                    <div class="movie-player-header">
                        <span class="movie-title">电影播放</span>
                        <span class="movie-link">
                            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">原始链接</a>
                        </span>
                    </div>
                    <div style="text-align: center; padding: 10px; background-color: #f1f5f9; border-radius: 8px; margin-top: 10px;">
                        <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">请点击原始链接访问电影资源</p>
                        <div style="padding: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; word-break: break-all;">
                            <small>${originalUrl}</small>
                        </div>
                    </div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = messageHtml;
        messageArea.appendChild(messageDiv);
        
        // 滚动到底部
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 10);
    }
    
    // 更新用户列表
    function updateUserList(users) {
        userList.innerHTML = '';
        
        // 按字母顺序排序用户列表
        const sortedUsers = [...users].sort((a, b) => {
            // 将当前用户排在第一位
            if (a === username) return -1;
            if (b === username) return 1;
            // 其他用户按名称排序
            return a.localeCompare(b);
        });
        
        sortedUsers.forEach(user => {
            const li = document.createElement('li');
            li.className = user === username ? 'current-user' : '';
            li.textContent = user === username ? `${user} (我)` : user;
            
            // 添加鼠标悬停效果
            li.addEventListener('click', function() {
                if (user !== username) {
                    messageInput.value += `@${user} `;
                    messageInput.focus();
                }
            });
            
            userList.appendChild(li);
        });
        
        // 更新用户数量显示
        const userCountElement = document.querySelector('.user-list h3');
        if (userCountElement) {
            userCountElement.textContent = `在线用户 (${users.length})`;
        }
    }
    
    // 发送消息
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // 发送消息到服务器
        socket.emit('send_message', { username: username, message: message });
        
        // 清空输入框
        messageInput.value = '';
        
        // 隐藏emoji选择器
        emojiPicker.classList.remove('show');
    }
    
    // 生成常用emoji
    function generateEmojis() {
        const emojis = [
            '😊', '😂', '😍', '🤔', '😮', '😢', '😡', '👍',
            '👎', '❤️', '🎉', '🔥', '🤣', '😘', '🙏', '😴',
            '👋', '🤞', '🤗', '😅', '🤭', '🥳', '💪', '🌟',
            '🎈', '🎯', '🎁', '🎊', '💯', '👏', '🙌', '👊'
        ];
        
        emojis.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.addEventListener('click', function() {
                messageInput.value += emoji;
                messageInput.focus();
            });
            emojiPicker.appendChild(span);
        });
    }
    
    // 生成emoji
    generateEmojis();
    
    // 事件监听器
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    logoutButton.addEventListener('click', function() {
        // 确认退出
        if (confirm('确定要退出聊天室吗？')) {
            // 断开Socket.IO连接
            socket.disconnect();
            
            // 清除可能的会话信息
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('username');
            }
            
            // 重定向到登录页面
            window.location.href = '/';
        }
    });
    
    emojiButton.addEventListener('click', function() {
        emojiPicker.classList.toggle('show');
    });
    
    // 点击页面其他地方关闭emoji选择器
    document.addEventListener('click', function(e) {
        if (!emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.classList.remove('show');
        }
    });
    
    // Socket.IO事件处理
    socket.on('join_success', function(data) {
        addMessage('系统', `${username}，欢迎加入聊天室！`, false, true);
        updateUserList(data.users);
    });
    
    socket.on('user_joined', function(data) {
        addMessage('系统', `${data.username} 加入了聊天室！`, false, true);
        updateUserList(data.users);
    });
    
    socket.on('user_left', function(data) {
        addMessage('系统', `${data.username} 离开了聊天室！`, false, true);
        updateUserList(data.users);
    });
    
    socket.on('new_message', function(data) {
        const isSelf = data.username === username;
        addMessage(data.username, data.message, isSelf);
    });
    
    socket.on('ai_request', function(data) {
        // 显示AI请求消息
        addMessage('系统', `${data.username} 向川小农AI提问: ${data.query}`, false, true);
    });
    
    socket.on('ai_response', function(data) {
        // 显示AI回复消息，使用ai标记
        addMessage(data.username, data.message, false, true);
    });
    
    socket.on('movie_request', function(data) {
        // 显示电影请求消息
        addMessage('系统', `${data.username} 请求播放电影`, false, true, data);
    });
    
    socket.on('join_error', function(data) {
        alert(data.message);
        window.location.href = '/';
    });
    
    // 处理连接断开
    socket.on('disconnect', function() {
        console.log('已断开连接');
    });
    
    // 处理连接错误
    socket.on('connect_error', function(error) {
        console.error('连接错误:', error);
        alert('连接服务器失败，请刷新页面重试');
    });
});