// app.js - 数据管理仪表板 (免认证版本)

// Supabase 配置 - 直接内置
const SUPABASE_CONFIG = {
    url: 'https://umcobpyncbalzwquaers.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtY29icHluY2JhbHp3cXVhZXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMzkxMjcsImV4cCI6MjA0MzcxNTEyN30.8Af_Vx5T0j9bQ8g9RSCgM00VU1vCwGXvXvXvXvXvXvXvX'
};

// Supabase 客户端实例
let supabase = null;

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 数据管理仪表板初始化...');
    initializeApp();
});

// 初始化应用
function initializeApp() {
    try {
        // 确保 Supabase 库已加载
        if (typeof window.supabase === 'undefined') {
            showStatus('config-status', '❌ Supabase 库未加载，请刷新页面', 'error');
            return;
        }

        // 直接使用内置配置初始化 Supabase
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
        
        showStatus('config-status', '✅ 应用初始化成功！正在连接数据库...', 'info');
        
        // 测试连接
        testConnection();
    } catch (error) {
        console.error('Initialization error:', error);
        showStatus('config-status', '❌ 初始化失败: ' + error.message, 'error');
    }
}

// 测试连接
async function testConnection() {
    try {
        // 尝试获取数据库信息来测试连接
        const { data, error } = await supabase.from('user_reports').select('*').limit(1);
        
        if (error) {
            if (error.message.includes('does not exist')) {
                // 表不存在，但连接成功
                showStatus('config-status', '✅ 数据库连接成功！表不存在是正常的，您可以在"创建表"标签页创建表', 'success');
                showDashboard();
            } else if (error.message.includes('JWT')) {
                showStatus('config-status', '❌ 连接失败: API Key 可能无效', 'error');
            } else {
                showStatus('config-status', '✅ 数据库连接成功！', 'success');
                showDashboard();
            }
        } else {
            showStatus('config-status', '✅ 数据库连接成功！发现现有数据', 'success');
            showDashboard();
        }
    } catch (error) {
        console.error('Connection test error:', error);
        showStatus('config-status', '❌ 连接测试失败: ' + error.message, 'error');
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

// 显示主仪表板
function showDashboard() {
    document.getElementById('config-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
}

// 切换标签页
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

// 加载表数据
async function loadTableData() {
    const tableName = document.getElementById('table-name').value.trim();
    const container = document.getElementById('reports-container');
    
    if (!tableName) {
        container.innerHTML = '<div class="status error">❌ 请输入表名</div>';
        return;
    }
    
    container.innerHTML = '<div class="status info">📡 加载数据中...</div>';

    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100); // 限制返回数量

        if (error) {
            if (error.message.includes('does not exist')) {
                container.innerHTML = `
                    <div class="status error">
                        ❌ 表 "${tableName}" 不存在<br>
                        <small>请在"创建表"标签页创建表，或检查表名是否正确</small>
                    </div>`;
            } else {
                container.innerHTML = `<div class="status error">❌ 加载失败: ${error.message}</div>`;
            }
            return;
        }
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="status info">
                    📝 表 "${tableName}" 存在但是空的<br>
                    <small>请在"数据导入"标签页添加数据</small>
                </div>`;
            return;
        }
        
        // 显示数据
        renderTableData(tableName, data);
        
    } catch (error) {
        console.error('Load data error:', error);
        container.innerHTML = `<div class="status error">❌ 加载异常: ${error.message}</div>`;
    }
}

// 渲染表格数据
function renderTableData(tableName, data) {
    const container = document.getElementById('reports-container');
    const columns = Object.keys(data[0]);
    
    let html = `
        <div class="status success">
            ✅ 表 "${tableName}" 数据加载成功 (共 ${data.length} 条记录)
        </div>
        <div style="overflow-x: auto; margin-top: 16px;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        ${columns.map(col => `<th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach((row, index) => {
        html += `<tr ${index % 2 === 0 ? 'style="background: #fafafa;"' : ''}>`;
        columns.forEach(col => {
            const value = formatTableValue(row[col]);
            html += `<td style="padding: 12px; border-bottom: 1px solid #e5e7eb; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${value}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// 格式化表格值
function formatTableValue(value) {
    if (value === null || value === undefined) return '<em style="color: #999;">null</em>';
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 100) + '...';
    const str = value.toString();
    return str.length > 50 ? str.substring(0, 50) + '...' : str;
}

// 数据导入
async function handleImport() {
    const tableName = document.getElementById('import-table-name').value.trim();
    const fileInput = document.getElementById('file-input');
    
    if (!tableName) {
        alert('❌ 请输入目标表名');
        return;
    }
    
    if (!fileInput.files[0]) {
        alert('❌ 请选择要导入的文件');
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
            
            // 插入数据库
            const { error } = await supabase
                .from(tableName)
                .insert(data);
            
            if (error) {
                alert('❌ 导入失败: ' + error.message);
            } else {
                alert('✅ 导入成功！');
                // 清空表单
                fileInput.value = '';
                document.getElementById('import-preview').innerHTML = '';
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

// CSV 解析
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(header => header.trim());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        const obj = {};
        headers.forEach((header, index) => {
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
    const tableName = document.getElementById('export-table-name').value.trim();
    
    if (!tableName) {
        alert('❌ 请输入表名');
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            document.getElementById('export-result').innerHTML = 
                `<div class="status error">❌ 导出失败: ${error.message}</div>`;
            return;
        }
        
        if (!data || data.length === 0) {
            document.getElementById('export-result').innerHTML = 
                '<div class="status info">📝 没有数据可导出</div>';
            return;
        }
        
        const dataStr = JSON.stringify(data, null, 2);
        downloadFile(dataStr, `${tableName}-${new Date().getTime()}.json`, 'application/json');
        
        document.getElementById('export-result').innerHTML = 
            '<div class="status success">✅ JSON 文件导出成功！</div>';
            
    } catch (error) {
        document.getElementById('export-result').innerHTML = 
            `<div class="status error">❌ 导出异常: ${error.message}</div>`;
    }
}

async function exportAsCSV() {
    const tableName = document.getElementById('export-table-name').value.trim();
    
    if (!tableName) {
        alert('❌ 请输入表名');
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            document.getElementById('export-result').innerHTML = 
                `<div class="status error">❌ 导出失败: ${error.message}</div>`;
            return;
        }
        
        if (!data || data.length === 0) {
            document.getElementById('export-result').innerHTML = 
                '<div class="status info">📝 没有数据可导出</div>';
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return `"${value}"`;
            });
            csvRows.push(values.join(','));
        });
        
        const csvString = csvRows.join('\n');
        downloadFile(csvString, `${tableName}-${new Date().getTime()}.csv`, 'text/csv;charset=utf-8;');
        
        document.getElementById('export-result').innerHTML = 
            '<div class="status success">✅ CSV 文件导出成功！</div>';
            
    } catch (error) {
        document.getElementById('export-result').innerHTML = 
            `<div class="status error">❌ 导出异常: ${error.message}</div>`;
    }
}

// 创建表示例
function createSampleTable() {
    const tableName = document.getElementById('new-table-name').value.trim();
    
    if (!tableName) {
        alert('❌ 请输入表名');
        return;
    }

    const resultDiv = document.getElementById('create-table-result');
    resultDiv.innerHTML = `
        <div class="status info">
            📋 请在 Supabase SQL 编辑器中执行以下 SQL 来创建表 "${tableName}"：

            <pre style="margin-top: 10px; background: #1f2937; color: white; padding: 15px; border-radius: 6px;">
-- 创建表结构
CREATE TABLE IF NOT EXISTS ${tableName} (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 禁用RLS以便直接访问
ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;

-- 插入示例数据
INSERT INTO ${tableName} (name, description, category, value) VALUES
('示例项目1', '这是第一个示例项目', '类别A', 100.50),
('示例项目2', '这是第二个示例项目', '类别B', 200.75),
('示例项目3', '这是第三个示例项目', '类别A', 150.25);

-- 如果需要启用RLS但允许所有操作，可以执行：
-- ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "允许所有操作" ON ${tableName} FOR ALL USING (true);
            </pre>

            <p style="margin-top: 10px;">
                💡 执行完成后，您就可以在"数据查看"标签页查看和操作数据了。
            </p>
        </div>
    `;
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
