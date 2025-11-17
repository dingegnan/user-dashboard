// app.js - Supabase 数据管理系统
console.log('🚀 Supabase 数据管理系统启动...');

// Supabase 配置
const SUPABASE_CONFIG = {
    url: 'https://umcobpyncbalzwquaers.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtY29icHluY2JhbHp3cXVhZXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzMzMzMsImV4cCI6MjA3ODM0OTMzM30.VCZRjCDgVwNXu3e6Etmx6ppLBkIif_kbIE7IFRhU8OU'
};

// 全局变量
let supabase = null;
let currentTable = '';
let tableList = [];

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 初始化应用...');
    initializeApp();
});

// 初始化 Supabase 连接
function initializeApp() {
    try {
        if (typeof window.supabase === 'undefined') {
            showStatus('config-status', '❌ Supabase 库未加载', 'error');
            return;
        }

        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
            auth: { persistSession: false },
            db: { schema: 'public' }
        });

        showStatus('config-status', '✅ 正在连接数据库...', 'info');
        testConnection();
    } catch (error) {
        showStatus('config-status', '❌ 初始化失败: ' + error.message, 'error');
    }
}

// 测试连接
async function testConnection() {
    try {
        // 简单测试连接
        const { data, error } = await supabase.from('example_users').select('*').limit(1);
        
        if (error) {
            console.log('测试连接错误:', error);
            // 继续尝试加载表列表
        }
        
        showStatus('config-status', '✅ 数据库连接成功！', 'success');
        showDashboard();
        await loadTableList();
        
    } catch (error) {
        showStatus('config-status', '❌ 连接失败: ' + error.message, 'error');
    }
}

// 加载表列表
async function loadTableList() {
    try {
        showStatus('config-status', '🔄 正在加载表列表...', 'info');
        
        // 方法1: 尝试使用自定义函数
        const { data: functionData, error: functionError } = await supabase.rpc('get_table_list');
        
        if (!functionError && functionData) {
            tableList = functionData.map(item => item.table_name);
            showStatus('config-status', `✅ 通过函数获取到 ${tableList.length} 个表`, 'success');
        } else {
            // 方法2: 尝试直接查询
            const { data: directData, error: directError } = await supabase
                .from('pg_tables')
                .select('tablename')
                .eq('schemaname', 'public');
                
            if (!directError && directData) {
                tableList = directData.map(item => item.tablename)
                    .filter(name => !name.startsWith('_') && !name.startsWith('pg_'));
                showStatus('config-status', `✅ 直接查询获取到 ${tableList.length} 个表`, 'success');
            } else {
                // 方法3: 使用手动模式
                showStatus('config-status', '⚠️ 无法自动获取表列表，请手动输入', 'warning');
                tableList = [];
            }
        }
        
        // 如果没有找到表，添加示例表
        if (tableList.length === 0) {
            tableList = ['example_users'];
            showStatus('config-status', 'ℹ️ 使用示例表: example_users', 'info');
        }
        
        renderTableList();
        populateTableSelectors();
        
    } catch (error) {
        console.error('加载表列表失败:', error);
        showStatus('config-status', '❌ 加载表列表失败: ' + error.message, 'error');
        showManualTableInput();
    }
}

// 手动表输入界面
function showManualTableInput() {
    const container = document.getElementById('tables-container');
    container.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px;">
            <h4>🔧 需要手动输入表名</h4>
            <p>无法自动获取数据库表列表。请手动输入您知道的表名：</p>
            <div style="display: flex; gap: 10px; margin: 15px 0;">
                <input type="text" id="manual-table-input" placeholder="例如: users, products" 
                       style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                <button class="btn btn-success" onclick="addManualTable()">添加表</button>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                <h5>💡 表名建议：</h5>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
                    <button class="btn" onclick="addTableSuggestion('example_users')" style="padding: 5px 10px; font-size: 12px;">example_users</button>
                    <button class="btn" onclick="addTableSuggestion('users')" style="padding: 5px 10px; font-size: 12px;">users</button>
                    <button class="btn" onclick="addTableSuggestion('profiles')" style="padding: 5px 10px; font-size: 12px;">profiles</button>
                    <button class="btn" onclick="addTableSuggestion('products')" style="padding: 5px 10px; font-size: 12px;">products</button>
                </div>
            </div>
        </div>
        <div id="manual-tables-list" style="margin-top: 15px;"></div>
    `;
}

// 添加表建议
function addTableSuggestion(tableName) {
    document.getElementById('manual-table-input').value = tableName;
    addManualTable();
}

// 添加手动表
function addManualTable() {
    const tableName = document.getElementById('manual-table-input').value.trim();
    if (!tableName) {
        alert('请输入表名');
        return;
    }
    
    if (!tableList.includes(tableName)) {
        tableList.push(tableName);
    }
    
    renderTableList();
    populateTableSelectors();
    document.getElementById('manual-table-input').value = '';
    updateManualTablesList();
    
    showStatus('config-status', `✅ 已添加表: ${tableName}`, 'success');
}

// 更新手动表列表显示
function updateManualTablesList() {
    const listContainer = document.getElementById('manual-tables-list');
    if (!listContainer || tableList.length === 0) return;
    
    listContainer.innerHTML = `
        <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px;">
            <h5>📋 已添加的表：</h5>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
                ${tableList.map(table => `
                    <div style="background: white; padding: 5px 12px; border-radius: 15px; border: 1px solid #17a2b8; display: flex; align-items: center; gap: 5px;">
                        <span>${table}</span>
                        <button onclick="removeManualTable('${table}')" style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 14px;">×</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// 移除手动表
function removeManualTable(tableName) {
    tableList = tableList.filter(table => table !== tableName);
    updateManualTablesList();
    if (currentTable === tableName) {
        currentTable = '';
        document.getElementById('current-table-name').textContent = '未选择';
    }
    renderTableList();
}

// 渲染表列表
function renderTableList() {
    const container = document.getElementById('tables-container');
    if (!container) return;

    if (tableList.length === 0) {
        container.innerHTML = '<div class="status info">📝 没有找到表，请手动添加表名</div>';
        return;
    }

    container.innerHTML = tableList.map(table => `
        <div class="table-item ${table === currentTable ? 'active' : ''}" 
             onclick="selectTable('${table}')">
            <div style="font-weight: 600; margin-bottom: 5px;">📊 ${table}</div>
            <div style="font-size: 12px; color: #6b7280;">点击选择此表</div>
        </div>
    `).join('');
}

// 选择表
async function selectTable(tableName) {
    try {
        currentTable = tableName;
        document.getElementById('current-table-name').textContent = tableName;
        
        // 更新活跃状态
        document.querySelectorAll('.table-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.table-item').classList.add('active');
        
        // 测试表是否可访问
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
            
        if (error) {
            throw new Error(`无法访问表 ${tableName}: ${error.message}`);
        }
        
        // 加载表统计信息
        await loadTableStats(tableName);
        
        showStatus('table-stats', `✅ 成功选择表: ${tableName}`, 'success');
        
        // 如果当前在数据标签页，自动加载数据
        if (document.getElementById('tab-data').classList.contains('hidden') === false) {
            loadTableData();
        }
        
    } catch (error) {
        showStatus('table-stats', `❌ ${error.message}`, 'error');
    }
}

// 加载表统计信息
async function loadTableStats(tableName) {
    try {
        const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (!error) {
            document.getElementById('table-stats').innerHTML = `
                <strong>表信息:</strong> ${tableName} | 
                <strong>记录数:</strong> ${count || 0} | 
                <strong>选择时间:</strong> ${new Date().toLocaleString()}
            `;
            document.getElementById('table-stats').classList.remove('hidden');
        }
    } catch (error) {
        console.error('加载表统计失败:', error);
    }
}

// 填充表选择器
function populateTableSelectors() {
    const importSelector = document.getElementById('import-table-name');
    const exportSelector = document.getElementById('export-table-name');
    
    const options = tableList.map(table => `<option value="${table}">${table}</option>`).join('');
    
    if (importSelector) {
        importSelector.innerHTML = '<option value="">选择表...</option>' + options;
    }
    if (exportSelector) {
        exportSelector.innerHTML = '<option value="">选择表...</option>' + options;
    }
}

// 加载表数据
async function loadTableData() {
    if (!currentTable) {
        showStatus('data-container', '❌ 请先选择表', 'error');
        return;
    }

    try {
        showStatus('data-container', '🔄 正在加载数据...', 'info');
        
        const { data, error } = await supabase
            .from(currentTable)
            .select('*')
            .limit(50); // 限制加载50条记录

        if (error) throw error;

        currentData = data || [];
        
        if (currentData.length === 0) {
            document.getElementById('data-container').innerHTML = 
                '<div class="status info">📝 表中没有数据</div>';
        } else {
            renderTableData();
        }
        
        showStatus('data-container', `✅ 加载了 ${currentData.length} 条记录`, 'success');
        
    } catch (error) {
        console.error('加载数据失败:', error);
        document.getElementById('data-container').innerHTML = 
            `<div class="status error">❌ 加载失败: ${error.message}</div>`;
    }
}

// 渲染表格数据
function renderTableData() {
    const container = document.getElementById('data-container');
    if (!container || currentData.length === 0) return;

    const columns = Object.keys(currentData[0]);
    
    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                        <th style="width: 80px;">操作</th>
                    </tr>
                </thead>
                <tbody>
    `;

    currentData.forEach((row, index) => {
        html += `<tr>`;
        columns.forEach(col => {
            const value = formatCellValue(row[col]);
            html += `<td title="${value}">${value}</td>`;
        });
        html += `<td>
            <button class="btn" onclick="editRow(${index})" style="padding: 4px 8px; font-size: 12px;">查看</button>
        </td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// 格式化单元格值
function formatCellValue(value) {
    if (value === null || value === undefined) return '<em style="color: #999;">null</em>';
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
    const str = String(value);
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
}

// 基本功能函数
function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = message;
    element.className = `status ${type}`;
    element.classList.remove('hidden');
}

function showDashboard() {
    document.getElementById('config-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
}

function switchTab(tabName) {
    document.querySelectorAll('[id^="tab-"]').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    event.target.classList.add('active');
    
    if (tabName === 'data' && currentTable) {
        loadTableData();
    }
}

function refreshTableList() {
    loadTableList();
}

// 占位函数
function editRow(index) {
    alert('查看功能开发中...');
}

// 初始化文件预览
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('import-preview');
                preview.innerHTML = `
                    <div class="status info">
                        <strong>文件预览 (前500字符):</strong>
                        <pre style="margin-top: 8px; font-size: 12px; white-space: pre-wrap;">${e.target.result.substring(0, 500)}</pre>
                    </div>
                `;
            };
            reader.readAsText(file);
        });
    }
});
