document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const serverSelect = document.getElementById('server');
    const errorMessage = document.getElementById('errorMessage');
    
    // 表单提交事件处理
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const server = serverSelect.value;
        
        // 用户名验证
        if (!username) {
            showError('请输入昵称');
            return;
        }
        
        if (username.length < 2 || username.length > 20) {
            showError('昵称长度应在2-20个字符之间');
            return;
        }
        
        if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(username)) {
            showError('昵称只能包含中文、英文、数字和下划线');
            return;
        }
        
        // 检查用户名是否已存在
        checkUsername(username, function(available) {
            if (available) {
                // 用户名可用，跳转到聊天室并传递服务器地址
                window.location.href = `/chat?username=${encodeURIComponent(username)}&server=${encodeURIComponent(server)}`;
            } else {
                showError('用户名已存在，请选择其他昵称');
            }
        });
    });
    
    // 检查用户名是否可用
    function checkUsername(username, callback) {
        // 添加加载状态
        const loginButton = document.getElementById('loginButton');
        const originalText = loginButton.textContent;
        loginButton.textContent = '检查中...';
        loginButton.disabled = true;
        
        fetch('/check_username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: username })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误');
            }
            return response.json();
        })
        .then(data => {
            callback(data.available);
        })
        .catch(error => {
            console.error('检查用户名失败:', error);
            showError('网络连接失败，请重试');
            // 发生错误时不允许登录，确保用户唯一性
            callback(false);
        })
        .finally(() => {
            // 恢复按钮状态
            loginButton.textContent = originalText;
            loginButton.disabled = false;
        });
    }
    
    // 显示错误消息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // 3秒后自动隐藏错误消息
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
});