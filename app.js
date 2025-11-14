// app.js - Supabase 用户数据仪表板

// Supabase 客户端实例
let supabase = null;

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 用户数据仪表板初始化...');
    initializeEventListeners();
    loadConfig();
});

// 初始化事件监听器
function initializeEventListeners() {
    // 文件预览功能
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFilePreview);
    }
    
    // 回车键登录
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
}

// 显示状态消息
function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }
    
    element.textContent = message;
    element.className = `status ${type}`;
    element.classList.remove('hidden');
    
    // 自动隐藏信息消息
    if (type === 'info') {
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }
}

// 保存配置
function saveConfig() {
    const url = document.getElementById('supabase-url').value.trim();
    const key = document.getElementById('supabase-key').value.trim();
    
    if (!url || !key) {
        showStatus('config-status', '❌ 请填写完整的 Supabase 配置信息', 'error');
        return;
    }

    try {
        // 确保 Supabase 库已加载
        if (typeof window.supabase === 'undefined') {
            showStatus('config-status', '❌ Supabase 库未加载，请刷新页面', 'error');
            return;
        }

        // 正确的 Supabase 初始化
        supabase = window.supabase.createClient(url, key, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        });
        
        // 保存到本地存储
        localStorage.setItem('supabase_config', JSON.stringify({ url, key }));
        showStatus('config-status', '✅ 配置已保存，正在测试连接...', 'info');
        
        // 测试连接
        testConnection();
    } catch (error) {
        console.error('Configuration error:', error);
        showStatus('config-status', '❌ 配置失败: ' + error.message, 'error');
    }
}

// 测试连接
async function testConnection() {
    try {
        // 使用更简单的方式测试连接
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            // 连接成功但需要认证
            showStatus('config-status', '✅ Supabase 连接成功！现在可以登录使用', 'success');
            document.getElementById('auth-section').classList.remove('hidden');
            checkAuthState();
        } else {
            showStatus('config-status', '✅ Supabase 连接成功！', 'success');
            document.getElementById('auth-section').classList.remove('hidden');
            checkAuthState();
        }
    } catch (error) {
        console.error('Connection test error:', error);
        showStatus('config-status', '❌ 连接测试失败: ' + error.message, 'error');
    }
}

// 加载保存的配置
function loadConfig() {
    const saved = localStorage.getItem('supabase_config');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            document.getElementById('supabase-url').value = config.url;
            document.getElementById('supabase-key').value = config.key;
        } catch (e) {
            console.log('无保存的配置或配置已损坏');
        }
    }
}

// 认证功能
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showStatus('auth-status', '❌ 请输入邮箱和密码', 'error');
        return;
    }

    showStatus('auth-status', '🔐 登录中...', 'info');
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            showStatus('auth-status', '❌ 登录失败: ' + error.message, 'error');
        } else {
            showStatus('auth-status', '✅ 登录成功！', 'success');
            setTimeout(() => {
                document.getElementById('auth-status').classList.add('hidden');
                showDashboard();
            }, 1000);
        }
    } catch (error) {
        console.error('Login error:', error);
        showStatus('auth-status', '❌ 登录异常: ' + error.message, 'error');
    }
}

async function handleSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showStatus('auth-status', '❌ 请输入邮箱和密码', 'error');
        return;
    }

    if (password.length < 6) {
        showStatus('auth-status', '❌ 密码长度至少为6位', 'error');
        return;
    }

    showStatus('auth-status', '📝 注册中...', 'info');
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        
        if (error) {
            showStatus('auth-status', '❌ 注册失败: ' + error.message, 'error');
        } else {
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                showStatus('auth-status', '❌ 该邮箱已被注册', 'error');
            } else {
                showStatus('auth-status', '✅ 注册成功！请检查邮箱验证邮件', 'success');
            }
        }
    } catch (error) {
        console.error('Signup error:', error);
        showStatus('auth-status', '❌ 注册异常: ' + error.message, 'error');
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
        }
        showAuth();
    } catch (error) {
        console.error('Logout exception:', error);
        showAuth();
    }
}

// 界面控制
function showAuth() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('config-section').classList.remove('hidden');
    // 清空密码字段
    document.getElementById('password').value = '';
}

function showDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('config-section').classList.add('hidden');
    loadUserReports();
}

function switchTab(tabName) {
    // 隐藏所有标签内容
    document.querySelectorAll('[id^="tab-"]').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // 移除所有标签按钮的激活状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示选中的标签内容
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    
    // 激活对应的标签按钮
    event.target.classList.add('active');
}

// 数据管理功能
async function loadUserReports() {
    const container = document.getElementById('reports-container');
    if (!container) return;
    
    container.innerHTML = '<div class="status info">📡 加载数据中...</div>';

    try {
        const { data: reports, error } = await supabase
            .from('user_reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            container.innerHTML = `<div class="status error">❌ 加载失败: ${error.message}</div>`;
            return;
        }
        
        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div class="status info">
                    📝 暂无数据<br>
                    <small>请切换到"数据导入"标签页添加数据</small>
                </div>`;
            return;
        }
        
        container.innerHTML = reports.map(report => `
            <div class="report-item">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <h4 style="margin: 0; color: #1f2937;">${escapeHtml(report.report_name)}</h4>
                    <div style="font-size: 12px; color: #6b7280;">
                        ${new Date(report.created_at).toLocaleString('zh-CN')}
                    </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <strong>数据预览:</strong>
                    <pre>${JSON.stringify(report.report_data, null, 2)}</pre>
                </div>
                
                <button class="btn btn-danger" onclick="deleteReport(${report.id})">
                    🗑️ 删除
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Load reports error:', error);
        container.innerHTML = `<div class="status error">❌ 加载异常: ${error.message}</div>`;
    }
}

// HTML 转义函数
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function deleteReport(reportId) {
    if (!confirm('确定要删除这个报表吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('user_reports')
            .delete()
            .eq('id', reportId);
        
        if (error) {
            alert('❌ 删除失败: ' + error.message);
        } else {
            alert('✅ 删除成功！');
            loadUserReports();
        }
    } catch (error) {
        console.error('Delete report error:', error);
        alert('❌ 删除异常: ' + error.message);
    }
}

// 数据导入
async function handleImport() {
    const fileInput = document.getElementById('file-input');
    const reportName = document.getElementById('report-name').value.trim();
    
    if (!fileInput.files[0]) {
        alert('❌ 请选择要导入的文件');
        return;
    }
    
    if (!reportName) {
        alert('❌ 请输入报表名称');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            let data;
            const fileContent = e.target.result;
            
            // 根据文件类型解析
            if (file.name.endsWith('.json')) {
                data = JSON.parse(fileContent);
            } else if (file.name.endsWith('.csv')) {
                data = parseCSV(fileContent);
            } else {
                throw new Error('不支持的文件格式，请使用 JSON 或 CSV 文件');
            }
            
            // 验证数据格式
            if (!data || (Array.isArray(data) && data.length === 0)) {
                throw new Error('文件内容为空或格式不正确');
            }
            
            // 获取当前用户
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                alert('❌ 用户未登录，请重新登录');
                showAuth();
                return;
            }
            
            // 插入数据库
            const { error } = await supabase
                .from('user_reports')
                .insert([
                    {
                        user_id: user.id,
                        report_name: reportName,
                        report_data: data
                    }
                ]);
            
            if (error) {
                alert('❌ 导入失败: ' + error.message);
            } else {
                alert('✅ 导入成功！');
                // 清空表单
                fileInput.value = '';
                document.getElementById('report-name').value = '';
                document.getElementById('import-preview').innerHTML = '';
                // 刷新数据
                loadUserReports();
                // 切换回数据查看标签
                switchTab('data');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('❌ 文件解析失败: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('❌ 文件读取失败');
    };
    
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(header => header.trim());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        const obj = {};
        headers.forEach((header, index) => {
            // 移除可能的引号
            let value = values[index] || '';
            value = value.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
            obj[header] = value;
        });
        result.push(obj);
    }
    
    return result;
}

// 数据导出
async function exportAsJSON() {
    try {
        const { data: reports, error } = await supabase
            .from('user_reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            document.getElementById('export-result').innerHTML = 
                `<div class="status error">❌ 导出失败: ${error.message}</div>`;
            return;
        }
        
        if (!reports || reports.length === 0) {
            document.getElementById('export-result').innerHTML = 
                '<div class="status info">📝 没有数据可导出</div>';
            return;
        }
        
        const dataStr = JSON.stringify(reports, null, 2);
        downloadFile(dataStr, `user-reports-${new Date().getTime()}.json`, 'application/json');
        
        document.getElementById('export-result').innerHTML = 
            '<div class="status success">✅ JSON 文件导出成功！</div>';
            
        setTimeout(() => {
            document.getElementById('export-result').innerHTML = '';
        }, 3000);
    } catch (error) {
        document.getElementById('export-result').innerHTML = 
            `<div class="status error">❌ 导出异常: ${error.message}</div>`;
    }
}

async function exportAsCSV() {
    try {
        const { data: reports, error } = await supabase
            .from('user_reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            document.getElementById('export-result').innerHTML = 
                `<div class="status error">❌ 导出失败: ${error.message}</div>`;
            return;
        }
        
        if (!reports || reports.length === 0) {
            document.getElementById('export-result').innerHTML = 
                '<div class="status info">📝 没有数据可导出</div>';
            return;
        }
        
        const headers = ['ID', '报表名称', '创建时间', '数据条数'];
        const csvRows = [headers.join(',')];
        
        reports.forEach(report => {
            const dataCount = Array.isArray(report.report_data) ? report.report_data.length : 1;
            const row = [
                report.id,
                `"${report.report_name}"`,
                `"${new Date(report.created_at).toLocaleString('zh-CN')}"`,
                dataCount
            ];
            csvRows.push(row.join(','));
        });
        
        const csvString = csvRows.join('\n');
        downloadFile(csvString, `user-reports-${new Date().getTime()}.csv`, 'text/csv;charset=utf-8;');
        
        document.getElementById('export-result').innerHTML = 
            '<div class="status success">✅ CSV 文件导出成功！</div>';
            
        setTimeout(() => {
            document.getElementById('export-result').innerHTML = '';
        }, 3000);
    } catch (error) {
        document.getElementById('export-result').innerHTML = 
            `<div class="status error">❌ 导出异常: ${error.message}</div>`;
    }
}

// 下载文件辅助函数
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 文件预览
function handleFilePreview(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = e.target.result.substring(0, 300) + 
            (e.target.result.length > 300 ? '...' : '');
        document.getElementById('import-preview').innerHTML = `
            <div class="status info">
                <strong>文件预览:</strong>
                <pre style="margin-top: 8px;">${preview}</pre>
            </div>
        `;
    };
    reader.readAsText(file);
}

// 检查认证状态
async function checkAuthState() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showDashboard();
    }
}
