<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>用户数据仪表板</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 8px; font-size: 14px; transition: all 0.3s; }
        .btn:hover { background: #2563eb; transform: translateY(-1px); }
        .btn:disabled { background: #9ca3af; cursor: not-allowed; transform: none; }
        .btn-danger { background: #ef4444; }
        .btn-danger:hover { background: #dc2626; }
        .btn-success { background: #10b981; }
        .btn-success:hover { background: #059669; }
        input, select { padding: 12px; margin: 8px 0; border: 1px solid #d1d5db; border-radius: 8px; width: 100%; font-size: 14px; transition: border 0.3s; }
        input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .hidden { display: none; }
        .tab { display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; background: #f8fafc; border-radius: 8px; padding: 4px; }
        .tab-btn { flex: 1; padding: 12px; background: none; border: none; cursor: pointer; border-radius: 6px; transition: all 0.3s; }
        .tab-btn.active { background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); color: #3b82f6; font-weight: 600; }
        .status { padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 14px; }
        .status.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
        .status.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        .status.info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
        .report-item { border: 1px solid #e5e7eb; padding: 20px; margin: 16px 0; border-radius: 12px; background: #fafafa; transition: all 0.3s; }
        .report-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px); }
        pre { background: #1f2937; color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 12px 0; }
        .config-panel { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; font-size: 2.5em; margin-bottom: 8px;">🚀 用户数据仪表板</h1>
            <p style="color: #6b7280; font-size: 1.1em;">基于 Supabase + Vercel 的完整数据管理解决方案</p>
        </div>

        <!-- 配置面板 -->
        <div class="card config-panel" id="config-section">
            <h2>🔧 Supabase 配置</h2>
            <p style="color: #6b7280; margin-bottom: 20px;">请填写你的 Supabase 项目信息</p>
            
            <div style="display: grid; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Project URL:</label>
                    <input type="text" id="supabase-url" 
                           placeholder="https://umcobpyncbalzwquaers.supabase.co"
                           value="https://umcobpyncbalzwquaers.supabase.co">
                    <small style="color: #6b7280;">在 Supabase Settings → API 中找到</small>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Anon Key:</label>
                    <input type="text" id="supabase-key" 
                           placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                           value="">
                    <small style="color: #6b7280;">在 Supabase Settings → API 中找到 anon public key</small>
                </div>
            </div>
            
            <button class="btn btn-success" onclick="saveConfig()" style="margin-top: 16px;">
                💾 保存配置并测试连接
            </button>
            <div id="config-status" class="status hidden"></div>
        </div>

        <!-- 认证区域 -->
        <div class="card hidden" id="auth-section">
            <h2>🔐 用户认证</h2>
            <div style="display: grid; gap: 12px; max-width: 400px; margin: 0 auto;">
                <input type="email" id="email" placeholder="请输入邮箱地址" value="test@example.com">
                <input type="password" id="password" placeholder="请输入密码" value="password123">
                <div style="display: flex; gap: 12px;">
                    <button class="btn" onclick="handleLogin()" style="flex: 1;">登录</button>
                    <button class="btn" onclick="handleSignUp()" style="flex: 1;">注册</button>
                </div>
            </div>
            <div id="auth-status" class="status hidden"></div>
        </div>

        <!-- 主仪表板 -->
        <div class="card hidden" id="dashboard-section">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0;">📊 数据仪表板</h2>
                <button class="btn btn-danger" onclick="handleLogout()">🚪 退出登录</button>
            </div>

            <!-- 标签页 -->
            <div class="tab">
                <button class="tab-btn active" onclick="switchTab('data')">📋 数据查看</button>
                <button class="tab-btn" onclick="switchTab('import')">📥 数据导入</button>
                <button class="tab-btn" onclick="switchTab('export')">📤 数据导出</button>
            </div>

            <!-- 数据查看 -->
            <div id="tab-data">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>我的数据报表</h3>
                    <button class="btn" onclick="loadUserReports()">🔄 刷新数据</button>
                </div>
                <div id="reports-container"></div>
            </div>

            <!-- 数据导入 -->
            <div id="tab-import" class="hidden">
                <h3>📥 数据导入</h3>
                <p style="color: #6b7280; margin-bottom: 20px;">支持 JSON 和 CSV 格式文件导入</p>
                
                <div style="display: grid; gap: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">选择文件:</label>
                        <input type="file" id="file-input" accept=".json,.csv">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">报表名称:</label>
                        <input type="text" id="report-name" placeholder="例如: 销售数据2024">
                    </div>
                </div>
                
                <button class="btn btn-success" onclick="handleImport()" style="margin-top: 16px;">
                    📤 开始导入
                </button>
                
                <div id="import-preview" style="margin-top: 20px;"></div>
            </div>

            <!-- 数据导出 -->
            <div id="tab-export" class="hidden">
                <h3>📤 数据导出</h3>
                <p style="color: #6b7280; margin-bottom: 20px;">将您的数据导出为文件格式</p>
                
                <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                    <button class="btn" onclick="exportAsJSON()">📄 导出为 JSON</button>
                    <button class="btn" onclick="exportAsCSV()">📊 导出为 CSV</button>
                </div>
                
                <div id="export-result"></div>
            </div>
        </div>
    </div>

    <script>
        // Supabase 客户端实例
        let supabase = null;

        // 显示状态消息
        function showStatus(elementId, message, type = 'info') {
            const element = document.getElementById(elementId);
            element.textContent = message;
            element.className = `status ${type}`;
            element.classList.remove('hidden');
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
                // 使用正确的 Supabase 客户端配置
                supabase = window.supabase.createClient(url, key, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true
                    }
                });
                
                // 保存到本地存储
                localStorage.setItem('supabase_config', JSON.stringify({ url, key }));
                showStatus('config-status', '✅ 配置已保存，正在测试连接...', 'info');
                
                // 测试连接
                testConnection();
            } catch (error) {
                showStatus('config-status', '❌ 配置失败: ' + error.message, 'error');
            }
        }

        // 测试连接
        async function testConnection() {
            try {
                // 测试 API 连接
                const { data, error } = await supabase.from('user_reports').select('count').limit(1);
                
                if (error && error.message.includes('JWT')) {
                    // 这是正常的，说明连接成功但需要认证
                    showStatus('config-status', '✅ Supabase 连接成功！现在可以登录使用', 'success');
                    document.getElementById('auth-section').classList.remove('hidden');
                    checkAuthState();
                } else if (error) {
                    showStatus('config-status', '❌ 连接测试失败: ' + error.message, 'error');
                } else {
                    showStatus('config-status', '✅ Supabase 连接成功！', 'success');
                    document.getElementById('auth-section').classList.remove('hidden');
                    checkAuthState();
                }
            } catch (error) {
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
                    // 自动初始化
                    saveConfig();
                } catch (e) {
                    console.log('无保存的配置');
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
        }

        async function handleSignUp() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showStatus('auth-status', '❌ 请输入邮箱和密码', 'error');
                return;
            }

            showStatus('auth-status', '📝 注册中...', 'info');
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            
            if (error) {
                showStatus('auth-status', '❌ 注册失败: ' + error.message, 'error');
            } else {
                showStatus('auth-status', '✅ 注册成功！请检查邮箱验证邮件', 'success');
            }
        }

        async function handleLogout() {
            await supabase.auth.signOut();
            showAuth();
        }

        // 界面控制
        function showAuth() {
            document.getElementById('auth-section').classList.remove('hidden');
            document.getElementById('dashboard-section').classList.add('hidden');
            document.getElementById('config-section').classList.remove('hidden');
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
                            <h4 style="margin: 0; color: #1f2937;">${report.report_name}</h4>
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
                container.innerHTML = `<div class="status error">❌ 加载异常: ${error.message}</div>`;
            }
        }

        async function deleteReport(reportId) {
            if (!confirm('确定要删除这个报表吗？此操作不可撤销。')) {
                return;
            }
            
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
                    } else {
                        data = parseCSV(fileContent);
                    }
                    
                    // 获取当前用户
                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    if (userError || !user) {
                        alert('❌ 用户未登录，请重新登录');
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
                    alert('❌ 文件解析失败: ' + error.message);
                }
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
                    obj[header] = values[index] || '';
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
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `user-reports-${new Date().getTime()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                document.getElementById('export-result').innerHTML = 
                    '<div class="status success">✅ JSON 文件导出成功！</div>';
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
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `user-reports-${new Date().getTime()}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                document.getElementById('export-result').innerHTML = 
                    '<div class="status success">✅ CSV 文件导出成功！</div>';
            } catch (error) {
                document.getElementById('export-result').innerHTML = 
                    `<div class="status error">❌ 导出异常: ${error.message}</div>`;
            }
        }

        // 文件预览
        document.getElementById('file-input').addEventListener('change', function(e) {
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
        });

        // 检查认证状态
        async function checkAuthState() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                showDashboard();
            }
        }

        // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            loadConfig();
        });
    </script>
</body>
</html>
