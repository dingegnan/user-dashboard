// Supabase 配置
const SUPABASE_URL = 'https://umcobpyncbalzwquaers.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtY29icHluY2JhbHp3cXVhZXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzMzMzMsImV4cCI6MjA3ODM0OTMzM30.VCZRjCDgVwNXu3e6Etmx6ppLBkIif_kbIE7IFRhU8OU';

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM 元素
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const reportsList = document.getElementById('reports-list');
const importPreview = document.getElementById('import-preview');
const exportResult = document.getElementById('export-result');

// 初始化检查登录状态
checkAuth();

// 认证相关函数
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showDashboard();
    } else {
        showAuth();
    }
}

function showAuth() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    loadUserReports();
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        alert('登录失败: ' + error.message);
    } else {
        showDashboard();
    }
}

async function handleSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { error } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (error) {
        alert('注册失败: ' + error.message);
    } else {
        alert('注册成功！请检查邮箱验证邮件');
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    showAuth();
}

// 标签页功能
function openTab(tabName) {
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // 移除所有标签按钮的激活状态
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // 显示选中的标签内容
    document.getElementById(tabName).classList.remove('hidden');
    
    // 激活对应的标签按钮
    event.target.classList.add('active');
}

// 数据管理函数
async function loadUserReports() {
    const { data: reports, error } = await supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('加载报表失败:', error);
        return;
    }
    
    if (reports.length === 0) {
        reportsList.innerHTML = '<p>暂无报表数据</p>';
        return;
    }
    
    reportsList.innerHTML = reports.map(report => `
        <div class="report-item">
            <h4>${report.report_name}</h4>
            <p>创建时间: ${new Date(report.created_at).toLocaleString()}</p>
            <pre>${JSON.stringify(report.report_data, null, 2)}</pre>
            <button onclick="deleteReport(${report.id})">删除</button>
        </div>
    `).join('');
}

async function deleteReport(reportId) {
    if (!confirm('确定要删除这个报表吗？')) return;
    
    const { error } = await supabase
        .from('user_reports')
        .delete()
        .eq('id', reportId);
    
    if (error) {
        alert('删除失败: ' + error.message);
    } else {
        loadUserReports();
    }
}

// 数据导入功能
async function handleImport() {
    const fileInput = document.getElementById('file-input');
    const reportName = document.getElementById('report-name').value;
    
    if (!fileInput.files[0] || !reportName) {
        alert('请选择文件并输入报表名称');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            let data;
            if (file.type === 'application/json') {
                data = JSON.parse(e.target.result);
            } else {
                // 简单的 CSV 解析
                const csvText = e.target.result;
                data = parseCSV(csvText);
            }
            
            // 获取当前用户
            const { data: { user } } = await supabase.auth.getUser();
            
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
                alert('导入失败: ' + error.message);
            } else {
                alert('导入成功！');
                fileInput.value = '';
                document.getElementById('report-name').value = '';
                importPreview.innerHTML = '';
                loadUserReports();
            }
        } catch (error) {
            alert('文件解析失败: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
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

// 数据导出功能
async function exportAsJSON() {
    const { data: reports, error } = await supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        alert('导出失败: ' + error.message);
        return;
    }
    
    const dataStr = JSON.stringify(reports, null, 2);
    downloadFile(dataStr, 'user-reports.json', 'application/json');
    exportResult.innerHTML = '<p>JSON 文件导出成功！</p>';
}

async function exportAsCSV() {
    const { data: reports, error } = await supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        alert('导出失败: ' + error.message);
        return;
    }
    
    if (reports.length === 0) {
        exportResult.innerHTML = '<p>没有数据可导出</p>';
        return;
    }
    
    // 创建 CSV 内容
    const headers = ['报表名称', '创建时间', '数据条数'];
    const csvRows = [headers.join(',')];
    
    reports.forEach(report => {
        const dataCount = Array.isArray(report.report_data) ? report.report_data.length : 1;
        const row = [
            `"${report.report_name}"`,
            `"${new Date(report.created_at).toLocaleString()}"`,
            dataCount
        ];
        csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    downloadFile(csvString, 'user-reports.csv', 'text/csv');
    exportResult.innerHTML = '<p>CSV 文件导出成功！</p>';
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

// 文件选择预览
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        importPreview.innerHTML = `
            <h4>文件预览:</h4>
            <pre>${e.target.result.substring(0, 500)}...</pre>
        `;
    };
    reader.readAsText(file);
});
