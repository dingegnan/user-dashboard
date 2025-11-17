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
let currentData = [];
let currentPage = 1;
let totalPages = 1;
let pageSize = 25;
let isEditingEnabled = false;
let editingRows = new Set();

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
        // 尝试获取表列表来测试连接
        const { data, error } = await supabase.from('_supabase_settings').select('*').limit(1);
        
        if (error) {
            await loadTableList(); // 直接尝试加载表列表
        } else {
            showStatus('config-status', '✅ 数据库连接成功！', 'success');
            showDashboard();
            loadTableList();
        }
    } catch (error) {
        showStatus('config-status', '❌ 连接失败: ' + error.message, 'error');
    }
}

// 加载表列表 - 使用自定义函数
async function loadTableList() {
    try {
        // 首先尝试使用自定义函数获取表列表
        const { data, error } = await supabase.rpc('get_table_list');

        if (error) {
            console.error('获取表列表失败:', error);
            // 备用方案：直接查询 pg_tables
            return await loadTableListFallback();
        }

        tableList = data.map(item => item.table_name);
        renderTableList();
        populateTableSelectors();
        showStatus('config-status', '✅ 数据库连接成功！发现 ' + tableList.length + ' 个表', 'success');
        showDashboard();
        
    } catch (error) {
        console.error('加载表列表失败:', error);
        await loadTableListFallback();
    }
}

// 备用方法：直接查询 pg_tables
async function loadTableListFallback() {
    try {
        const { data, error } = await supabase
            .from('pg_tables')
            .select('tablename')
            .eq('schemaname', 'public')
            .neq('tablename', 'pg_%')
            .neq('tablename', '_%')
            .order('tablename');

        if (error) throw error;

        tableList = data.map(item => item.tablename);
        renderTableList();
        populateTableSelectors();
        showStatus('config-status', '✅ 数据库连接成功！发现 ' + tableList.length + ' 个表', 'success');
        
    } catch (error) {
        console.error('备用方法失败:', error);
        showManualTableInput();
    }
}

// 手动表输入界面
function showManualTableInput() {
    const container = document.getElementById('tables-container');
    container.innerHTML = `
        <div style="background: #f8f9fa; border: 2px dashed #dee2e6; padding: 25px; border-radius: 12px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">🔧</div>
            <h4 style="color: #495057; margin-bottom: 10px;">手动表配置</h4>
            <p style="color: #6c757d; margin-bottom: 20px;">由于数据库权限设置，无法自动获取表列表。请手动输入您要操作的表名。</p>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center;">
                <input type="text" id="manual-table-input" 
                       placeholder="输入表名，例如: users, products, orders" 
                       style="flex: 1; max-width: 300px; padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px;">
                <button class="btn btn-success" onclick="addManualTable()" style="padding: 12px 20px;">
                    ➕ 添加表
                </button>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h5 style="margin-bottom: 10px;">💡 常见表名示例：</h5>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                    <span class="table-suggestion" onclick="fillTableSuggestion('users')">users</span>
                    <span class="table-suggestion" onclick="fillTableSuggestion('profiles')">profiles</span>
                    <span class="table-suggestion" onclick="fillTableSuggestion('products')">products</span>
                    <span class="table-suggestion" onclick="fillTableSuggestion('orders')">orders</span>
                    <span class="table-suggestion" onclick="fillTableSuggestion('customers')">customers</span>
                </div>
            </div>
        </div>
        
        <div id="manual-tables-list" style="margin-top: 20px;"></div>
    `;
    
    // 更新已添加的表列表
    updateManualTablesList();
}

// 填充表建议
function fillTableSuggestion(tableName) {
    document.getElementById('manual-table-input').value = tableName;
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
    if (tableList.length === 0) return;
    
    listContainer.innerHTML = `
        <div style="background: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px;">
            <h5 style="margin-bottom: 10px;">📋 已添加的表：</h5>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${tableList.map(table => `
                    <div style="background: white; padding: 8px 15px; border-radius: 20px; border: 1px solid #3b82f6; display: flex; align-items: center; gap: 8px;">
                        <span>${table}</span>
                        <button onclick="removeManualTable('${table}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">×</button>
                    </div>
                `).join('')}
            </div>
            <p style="margin-top: 10px; color: #666; font-size: 14px;">点击表名可以切换到该表进行操作</p>
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
}

// 渲染表列表
function renderTableList() {
    const container = document.getElementById('tables-container');
    if (!container) return;

    if (tableList.length === 0) {
        container.innerHTML = '<div class="status info">📝 数据库中没有找到表</div>';
        return;
    }

    container.innerHTML = tableList.map(table => `
        <div class="table-item ${table === currentTable ? 'active' : ''}" 
             onclick="selectTable('${table}')">
            <div style="font-weight: 600; margin-bottom: 5px;">${table}</div>
            <div style="font-size: 12px; color: #6b7280;">点击选择</div>
        </div>
    `).join('');
}

// 选择表
async function selectTable(tableName) {
    currentTable = tableName;
    document.getElementById('current-table-name').textContent = tableName;
    
    // 更新活跃状态
    document.querySelectorAll('.table-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.table-item').classList.add('active');
    
    // 加载表统计信息
    await loadTableStats(tableName);
    
    // 如果当前在数据标签页，自动加载数据
    if (document.getElementById('tab-data').classList.contains('hidden') === false) {
        loadTableData();
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
                <strong>记录数:</strong> ${count} | 
                <strong>最后更新:</strong> ${new Date().toLocaleString()}
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

    const searchTerm = document.getElementById('search-input').value;
    pageSize = parseInt(document.getElementById('page-size').value) || 25;

    try {
        let query = supabase
            .from(currentTable)
            .select('*', { count: 'exact' });

        // 添加搜索条件（简单实现，搜索所有文本字段）
        if (searchTerm) {
            // 这里可以优化为具体字段搜索
            query = query.or(`*.ilike.%${searchTerm}%`);
        }

        // 分页
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        currentData = data || [];
        totalPages = Math.ceil((count || 0) / pageSize);

        renderTableData();
        renderPagination();
        
    } catch (error) {
        console.error('加载数据失败:', error);
        document.getElementById('data-container').innerHTML = 
            `<div class="status error">❌ 加载失败: ${error.message}</div>`;
    }
}

// 渲染表格数据
function renderTableData() {
    const container = document.getElementById('data-container');
    if (!container || currentData.length === 0) {
        container.innerHTML = '<div class="status info">📝 没有数据</div>';
        return;
    }

    const columns = Object.keys(currentData[0]);
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">
                        <input type="checkbox" id="select-all" onchange="toggleSelectAll()">
                    </th>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                    <th style="width: 100px;">操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentData.forEach((row, index) => {
        const rowId = row.id || index;
        html += `<tr data-row-id="${rowId}" ${editingRows.has(rowId) ? 'class="editing"' : ''}>`;
        html += `<td><input type="checkbox" class="row-selector" value="${rowId}"></td>`;
        
        columns.forEach(col => {
            const value = formatCellValue(row[col]);
            if (editingRows.has(rowId)) {
                html += `<td><input type="text" class="edit-cell" data-field="${col}" value="${value}" onchange="markRowAsChanged(${rowId})"></td>`;
            } else {
                html += `<td title="${value}">${value}</td>`;
            }
        });
        
        html += `<td>
            <button class="btn" onclick="editRow(${rowId})" style="padding: 4px 8px; font-size: 12px;">✏️</button>
            <button class="btn btn-danger" onclick="deleteRow(${rowId})" style="padding: 4px 8px; font-size: 12px;">🗑️</button>
        </td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// 格式化单元格值
function formatCellValue(value) {
    if (value === null || value === undefined) return '<em style="color: #999;">null</em>';
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
    const str = String(value);
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
}

// 分页控件
function renderPagination() {
    const container = document.getElementById('pagination-controls');
    if (!container) return;

    let html = '';
    
    // 上一页
    html += `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">上一页</button>`;
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span style="padding: 8px 16px;">...</span>`;
        }
    }
    
    // 下一页
    html += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">下一页</button>`;
    
    container.innerHTML = html;
}

// 切换页面
function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadTableData();
}

// 启用编辑模式
function enableEditing() {
    isEditingEnabled = !isEditingEnabled;
    const button = document.querySelector('button[onclick="enableEditing()"]');
    
    if (isEditingEnabled) {
        button.textContent = '🔒 禁用编辑';
        button.classList.add('btn-warning');
        showStatus('data-container', '✏️ 编辑模式已启用 - 点击单元格进行编辑', 'info');
    } else {
        button.textContent = '✏️ 启用编辑';
        button.classList.remove('btn-warning');
        editingRows.clear();
        loadTableData();
    }
}

// 编辑行
function editRow(rowId) {
    editingRows.add(rowId);
    loadTableData();
}

// 标记行已更改
function markRowAsChanged(rowId) {
    // 可以在这里添加更改标记逻辑
    console.log('行已更改:', rowId);
}

// 保存所有更改
async function saveAllChanges() {
    if (editingRows.size === 0) {
        alert('没有要保存的更改');
        return;
    }

    try {
        for (const rowId of editingRows) {
            const rowElement = document.querySelector(`tr[data-row-id="${rowId}"]`);
            const inputs = rowElement.querySelectorAll('.edit-cell');
            const updates = {};
            
            inputs.forEach(input => {
                updates[input.dataset.field] = input.value;
            });
            
            const { error } = await supabase
                .from(currentTable)
                .update(updates)
                .eq('id', rowId);
                
            if (error) throw error;
        }
        
        editingRows.clear();
        loadTableData();
        alert('✅ 所有更改已保存！');
    } catch (error) {
        alert('❌ 保存失败: ' + error.message);
    }
}

// 添加新行
function addNewRow() {
    if (!currentTable) {
        alert('请先选择表');
        return;
    }
    
    showEditModal(null);
}

// 删除行
async function deleteRow(rowId) {
    if (!confirm('确定要删除这行数据吗？')) return;
    
    try {
        const { error } = await supabase
            .from(currentTable)
            .delete()
            .eq('id', rowId);
            
        if (error) throw error;
        
        loadTableData();
        alert('✅ 删除成功！');
    } catch (error) {
        alert('❌ 删除失败: ' + error.message);
    }
}

// 删除选中行
async function deleteSelectedRows() {
    const selected = Array.from(document.querySelectorAll('.row-selector:checked'))
        .map(cb => cb.value)
        .filter(id => id);
    
    if (selected.length === 0) {
        alert('请先选择要删除的行');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selected.length} 行数据吗？`)) return;
    
    try {
        const { error } = await supabase
            .from(currentTable)
            .delete()
            .in('id', selected);
            
        if (error) throw error;
        
        loadTableData();
        alert(`✅ 成功删除 ${selected.length} 行数据！`);
    } catch (error) {
        alert('❌ 删除失败: ' + error.message);
    }
}

// 全选/取消全选
function toggleSelectAll() {
    const selectAll = document.getElementById('select-all');
    const checkboxes = document.querySelectorAll('.row-selector');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });
}

// 数据导入
async function handleImport() {
    const tableName = document.getElementById('import-table-name').value;
    const fileInput = document.getElementById('file-input');
    const clearTable = document.getElementById('clear-table').checked;
    
    if (!tableName) {
        alert('请选择目标表');
        return;
    }
    
    if (!fileInput.files[0]) {
        alert('请选择要导入的文件');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            let data;
            const fileContent = e.target.result;
            
            if (file.name.endsWith('.json')) {
                data = JSON.parse(fileContent);
            } else if (file.name.endsWith('.csv')) {
                data = parseCSV(fileContent);
            } else {
                throw new Error('不支持的文件格式');
            }
            
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('文件内容格式不正确');
            }
            
            // 清空表（如果选择）
            if (clearTable) {
                const { error: deleteError } = await supabase
                    .from(tableName)
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有行
                    
                if (deleteError) throw deleteError;
            }
            
            // 插入数据
            const { error: insertError } = await supabase
                .from(tableName)
                .insert(data);
                
            if (insertError) throw insertError;
            
            document.getElementById('import-result').innerHTML = 
                '<div class="status success">✅ 导入成功！共导入 ' + data.length + ' 条记录</div>';
            
            // 清空表单
            fileInput.value = '';
            document.getElementById('import-preview').innerHTML = '';
            
        } catch (error) {
            console.error('导入失败:', error);
            document.getElementById('import-result').innerHTML = 
                `<div class="status error">❌ 导入失败: ${error.message}</div>`;
        }
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
        const values = lines[i].split(',').map(value => value.trim().replace(/^"(.*)"$/, '$1'));
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
    const tableName = document.getElementById('export-table-name').value;
    if (!tableName) {
        alert('请选择要导出的表');
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');
            
        if (error) throw error;
        
        const dataStr = JSON.stringify(data, null, 2);
        downloadFile(dataStr, `${tableName}-${new Date().getTime()}.json`, 'application/json');
        
        document.getElementById('export-result').innerHTML = 
            '<div class="status success">✅ JSON 导出成功！</div>';
            
    } catch (error) {
        document.getElementById('export-result').innerHTML = 
            `<div class="status error">❌ 导出失败: ${error.message}</div>`;
    }
}

async function exportAsCSV() {
    const tableName = document.getElementById('export-table-name').value;
    if (!tableName) {
        alert('请选择要导出的表');
        return;
    }

    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            document.getElementById('export-result').innerHTML = 
                '<div class="status info">📝 没有数据可导出</div>';
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header] || '';
                value = String(value);
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csvRows.push(values.join(','));
        });
        
        const csvString = csvRows.join('\n');
        downloadFile(csvString, `${tableName}-${new Date().getTime()}.csv`, 'text/csv;charset=utf-8;');
        
        document.getElementById('export-result').innerHTML = 
            '<div class="status success">✅ CSV 导出成功！</div>';
            
    } catch (error) {
        document.getElementById('export-result').innerHTML = 
            `<div class="status error">❌ 导出失败: ${error.message}</div>`;
    }
}

async function exportAsExcel() {
    alert('Excel 导出功能需要额外的库支持，建议使用 CSV 或 JSON 格式');
}

// SQL 查询工具
async function executeSQL() {
    const query = document.getElementById('sql-query').value.trim();
    if (!query) {
        alert('请输入 SQL 查询语句');
        return;
    }

    try {
        // 注意：Supabase JavaScript 客户端不支持直接执行任意 SQL
        // 这里需要使用 Supabase 的存储过程或者 REST API
        // 这是一个简化版本，只支持 SELECT 查询
        
        if (!query.toLowerCase().startsWith('select')) {
            alert('当前只支持 SELECT 查询语句');
            return;
        }
        
        // 这里应该调用自定义的 Edge Function 或存储过程
        // 暂时显示提示信息
        document.getElementById('sql-result').innerHTML = 
            '<div class="status info">🔧 SQL 执行功能需要配置 Supabase Edge Function</div>';
            
    } catch (error) {
        document.getElementById('sql-result').innerHTML = 
            `<div class="status error">❌ 执行失败: ${error.message}</div>`;
    }
}

// 工具函数
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

function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = message;
    element.className = `status ${type}`;
    element.classList.remove('hidden');
    
    if (type === 'info') {
        setTimeout(() => element.classList.add('hidden'), 5000);
    }
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
    
    // 切换到数据标签页时自动加载当前表数据
    if (tabName === 'data' && currentTable) {
        loadTableData();
    }
}

function refreshTableList() {
    loadTableList();
    showStatus('tables-container', '🔄 刷新表列表中...', 'info');
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showCreateTableModal() {
    showModal('create-table-modal');
}

function showEditModal(rowData) {
    // 实现编辑模态框逻辑
    showModal('edit-row-modal');
}

function createTable() {
    // 实现创建表逻辑
    alert('创建表功能需要额外的配置');
    hideModal('create-table-modal');
}

function saveRowEdit() {
    // 实现保存行编辑逻辑
    hideModal('edit-row-modal');
}

function clearSQL() {
    document.getElementById('sql-query').value = '';
}

// 文件预览
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = e.target.result.substring(0, 500) + 
                    (e.target.result.length > 500 ? '...' : '');
                document.getElementById('import-preview').innerHTML = `
                    <div class="status info">
                        <strong>文件预览:</strong>
                        <pre style="margin-top: 8px; font-size: 12px;">${preview}</pre>
                    </div>
                `;
            };
            reader.readAsText(file);
        });
    }
});

// 添加表建议的样式
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .table-suggestion {
            background: #e9ecef;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
            border: 1px solid #dee2e6;
        }
        .table-suggestion:hover {
            background: #3b82f6;
            color: white;
            transform: translateY(-2px);
        }
    </style>
`);
