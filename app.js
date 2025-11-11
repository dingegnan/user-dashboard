// Supabase 配置
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

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
async function checkAuth
