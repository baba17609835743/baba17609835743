// 代理状态检测功能
function checkProxyHealth() {
    // 创建代理状态指示器元素
    let proxyStatusElement = document.getElementById('proxy-status-indicator');
    if (!proxyStatusElement) {
        proxyStatusElement = document.createElement('div');
        proxyStatusElement.id = 'proxy-status-indicator';
        proxyStatusElement.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 8px 16px; border-radius: 20px; font-size: 12px; z-index: 1000; background: #f3f4f6; color: #64748b; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
        proxyStatusElement.textContent = '检查代理服务...';
        document.body.appendChild(proxyStatusElement);
    }
    
    // 发送健康检查请求
    fetch('/proxy-health')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'ok') {
                proxyStatusElement.textContent = '代理服务: 正常';
                proxyStatusElement.style.backgroundColor = '#d1fae5';
                proxyStatusElement.style.color = '#065f46';
            } else {
                proxyStatusElement.textContent = '代理服务: 异常';
                proxyStatusElement.style.backgroundColor = '#fee2e2';
                proxyStatusElement.style.color = '#991b1b';
            }
            
            // 3秒后隐藏状态指示器
            setTimeout(() => {
                proxyStatusElement.style.transition = 'opacity 0.3s ease';
                proxyStatusElement.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(proxyStatusElement)) {
                        document.body.removeChild(proxyStatusElement);
                    }
                }, 300);
            }, 3000);
        })
        .catch(error => {
            console.error('代理健康检查失败:', error);
            proxyStatusElement.textContent = '代理服务: 无法连接';
            proxyStatusElement.style.backgroundColor = '#fee2e2';
            proxyStatusElement.style.color = '#991b1b';
            
            // 3秒后隐藏状态指示器
            setTimeout(() => {
                proxyStatusElement.style.transition = 'opacity 0.3s ease';
                proxyStatusElement.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(proxyStatusElement)) {
                        document.body.removeChild(proxyStatusElement);
                    }
                }, 300);
            }, 3000);
        });
}

document.addEventListener('DOMContentLoaded', function() {
    // 检查代理服务健康状态
    checkProxyHealth();
    
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
        
        // 如果包含电影信息，添加视频播放功能
        if (movieInfo) {
            // 确保原始链接有正确的协议头
            let originalUrl = movieInfo.original_url;
            if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
                originalUrl = 'https://' + originalUrl;
            }
            
            // 使用代理URL或原始URL
            let videoUrl = movieInfo.has_proxy && movieInfo.parsed_url ? movieInfo.parsed_url : originalUrl;
            let proxyType = movieInfo.proxy_type || 'external';
            
            // 为每个视频容器生成唯一ID
            const videoContainerId = `video-container-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            messageHtml += `
                <div id="${videoContainerId}" class="movie-player-container">
                    <div class="movie-player-header">
                        <span class="movie-title">电影播放</span>
                        <span class="movie-link">
                            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">原始链接</a>
                        </span>
                    </div>
                    <!-- 视频播放区域 -->
                    <div class="video-player-wrapper">
                        <video class="movie-video" controls preload="metadata" style="max-width: 100%; height: auto;">
                            <source src="${videoUrl}" type="video/mp4">
                            <source src="${videoUrl}" type="video/webm">
                            <source src="${videoUrl}" type="video/ogg">
                            您的浏览器不支持HTML5视频播放。
                        </video>
                        <!-- 加载指示器 -->
                        <div class="video-loading-indicator" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; padding: 10px 20px; border-radius: 5px;">
                            正在加载视频...
                        </div>
                    </div>
                    <!-- 播放状态提示 -->
                    <div class="video-status" style="text-align: center; padding: 10px; margin-top: 5px; font-size: 13px; color: #64748b;">
                        ${proxyType === 'self-hosted' ? '(使用自有代理服务)' : '(使用外部代理)'} 
                    </div>
                    <!-- 错误提示区域 -->
                    <div class="video-error" style="display: none; text-align: center; padding: 10px; margin-top: 5px; color: #ef4444; font-size: 13px;"></div>
                    <!-- 重试按钮 -->
                    <div class="video-retry-container" style="display: none; text-align: center; margin-top: 5px;">
                        <button class="retry-btn" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                            重试加载视频
                        </button>
                    </div>
                    <!-- 备用链接显示 -->
                    <div class="video-fallback" style="text-align: center; padding: 10px; margin-top: 5px;">
                        <p style="color: #64748b; font-size: 14px;">如果视频无法直接播放，请点击上方原始链接</p>
                    </div>
                </div>
            `;
            
            // 添加脚本标记以设置视频事件处理
            messageHtml += `
                <script>
                (function() {
                    const container = document.getElementById('${videoContainerId}');
                    if (!container) return;
                    
                    const video = container.querySelector('.movie-video');
                    const loadingIndicator = container.querySelector('.video-loading-indicator');
                    const errorDiv = container.querySelector('.video-error');
                    const retryContainer = container.querySelector('.video-retry-container');
                    const retryBtn = container.querySelector('.retry-btn');
                    
                    // 视频加载开始
                    video.addEventListener('loadstart', function() {
                        loadingIndicator.style.display = 'block';
                        errorDiv.style.display = 'none';
                        retryContainer.style.display = 'none';
                    });
                    
                    // 视频可播放
                    video.addEventListener('canplay', function() {
                        loadingIndicator.style.display = 'none';
                    });
                    
                    // 视频加载错误
                    video.addEventListener('error', function(e) {
                        loadingIndicator.style.display = 'none';
                        errorDiv.style.display = 'block';
                        retryContainer.style.display = 'block';
                        
                        let errorMessage = '视频加载失败';
                        switch(video.error.code) {
                            case video.error.MEDIA_ERR_ABORTED:
                                errorMessage = '视频加载已中止';
                                break;
                            case video.error.MEDIA_ERR_NETWORK:
                                errorMessage = '网络错误导致视频加载失败';
                                break;
                            case video.error.MEDIA_ERR_DECODE:
                                errorMessage = '视频解码失败';
                                break;
                            case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                                errorMessage = '视频格式不受支持';
                                break;
                        }
                        errorDiv.textContent = errorMessage;
                    });
                    
                    // 重试按钮点击事件
                    if (retryBtn) {
                        retryBtn.addEventListener('click', function() {
                            // 重置视频
                            video.poster = '';
                            video.src = '';
                            loadingIndicator.style.display = 'block';
                            errorDiv.style.display = 'none';
                            retryContainer.style.display = 'none';
                            
                            // 重新设置视频源
                            setTimeout(() => {
                                video.src = video.querySelector('source').src;
                                video.load();
                                video.play().catch(e => console.log('Auto-play prevented:', e));
                            }, 300);
                        });
                    }
                })();
                </script>
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