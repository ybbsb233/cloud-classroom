import {refreshAttendanceNotice, studentAttendance} from './attendance.js?v=20261020-attendance-1';
import {schedulePage} from './schedule.js?v=20261020-attendance-1';
import {api, tokenKey} from './api.js?v=20261020-attendance-1';
import {$, busy, errorBox, esc, heading, toast} from './common.js?v=20261020-attendance-1';
import {studentPage} from './student.js?v=20261020-attendance-1';
import {adminPage} from './admin.js?v=20261020-attendance-1';

let page = document.body.dataset.page;
const titles = {
    attendance: '课程签到',
    schedule: '我的课表',
    home: '学习首页',
    courses: '我的课程',
    practice: '开始练习',
    answer: '练习进行中',
    history: '练习记录',
    wrong: '错题本',
    analysis: '薄弱项分析',
    dashboard: '整体统计',
    'admin-courses': '课程概览',
    'course-detail': '课程详情',
    'admin-practices': '全部练习记录',
    classes: '任教班级',
    students: '学生管理',
    'student-detail': '学生详情',
    account: '账号设置',
    result: '练习结果'
};
export let currentUser;

async function login() {
    const expired = new URLSearchParams(location.search).has('expired');
    if (expired) $('#login-message').innerHTML = errorBox('登录已失效，请重新登录。');
    $('#login-form').onsubmit = async e => {
        e.preventDefault();
        const button = $('button[type=submit]', e.target);
        await busy(button, async () => {
            $('#login-message').textContent = '';
            try {
                const result = await api('/auth/login', {
                    method: 'POST',
                    body: {username: $('#username').value.trim(), password: $('#password').value}
                });
                sessionStorage.setItem(tokenKey, result.token);
                redirect(result.user);
            } catch (error) {
                $('#login-message').innerHTML = errorBox(error.message);
            }
        });
    };
}

function redirect(user) {
    location.replace(user.role === 'TEACHER' ? '/admin/dashboard.html' : '/student/home.html');
}

function shell(user) {
    const admin = user.role === 'TEACHER';
    const links = admin ? [['dashboard', '◫', '整体统计', '/admin/dashboard.html'], ['admin-courses', '▤', '课程概览', '/admin/courses.html'], ['admin-practices', '≡', '练习记录', '/admin/practices.html'], ['classes', '▦', '任教班级', '/admin/classes.html'], ['students', '♧', '学生管理', '/admin/students.html']] : [['home', '◫', '学习首页', '/student/home.html'], ['courses', '▤', '我的课程', '/student/courses.html'], ['practice', '＋', '开始练习', '/student/practice.html'], ['history', '≡', '练习记录', '/student/history.html'], ['wrong', '◇', '错题本', '/student/wrong.html'], ['analysis', '↗', '薄弱项分析', '/student/analysis.html']];
    links.splice(1, 0, ['schedule', '▦', '我的课表', admin ? '/admin/schedule.html' : '/student/schedule.html']);
    if (!admin) links.splice(2, 0, ['attendance', '✓', '课程签到', '/student/attendance.html']);
    links.push(['account', '⚙', '账号设置', '/account.html']);
    document.body.innerHTML = `<div class="app"><aside class="sidebar"><a class="brand" href="${admin ? '/admin/dashboard.html' : '/student/home.html'}"><span class="brand-mark">云</span><span><strong>云课学伴</strong><small>CLASSROOM WORKSPACE</small></span></a><div class="nav-label">${admin ? '教学管理' : '我的学习'}</div><nav aria-label="主导航">${links.map(([id, icon, title, url]) => `<a class="nav-link ${page === id || (page === 'course-detail' && id === 'admin-courses') || (page === 'answer' && id === 'practice') || (page === 'student-detail' && id === 'students') ? 'active' : ''}" href="${url}"><span class="nav-icon" aria-hidden="true">${icon}</span>${title}</a>`).join('')}</nav><div class="sidebar-bottom"><strong>专注当下，学有所进</strong>云课学伴 · 学习分析系统<br>数据库系统课程设计</div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">${admin ? '管理工作台' : '学习空间'} <span aria-hidden="true"> / </span> ${titles[page] || ''}</div><div class="profile"><span class="avatar">${esc(user.realName.slice(0, 1))}</span><span>${esc(user.realName)}</span><span class="badge">${admin ? '教师' : '学生'}</span><button id="logout" class="text small">退出</button></div></header><main id="main" class="main"><div class="loading">正在加载…</div></main></div></div>`;
    $('#logout').onclick = () => busy($('#logout'), async () => {
        await api('/auth/logout', {method: 'POST'});
        sessionStorage.removeItem(tokenKey);
        location.replace('/login.html');
    });
}

async function account(user) {
    $('#main').innerHTML = heading('ACCOUNT', '账号设置', '管理个人信息与登录密码。') + `<div class="card account-card"><div class="notice">修改密码为可选操作，你可以继续使用当前密码。</div><div class="row between"><div><h2>${esc(user.realName)}</h2><p class="muted">${user.role === 'TEACHER' ? '教师账号' : '学生学号'}：${esc(user.username)}</p></div><span class="badge">${user.role === 'TEACHER' ? '教师' : '学生'}</span></div><hr style="border:0;border-top:1px solid var(--line);margin:20px 0 25px"><form id="password-form"><div class="field"><label for="old-password">原密码</label><input id="old-password" type="password" required autocomplete="current-password"></div><div class="field"><label for="new-password">新密码</label><input id="new-password" type="password" required minlength="6" maxlength="72" autocomplete="new-password"><small>至少 6 位，不能继续使用默认密码 123456。</small></div><div class="field"><label for="confirm-password">确认新密码</label><input id="confirm-password" type="password" required autocomplete="new-password"></div><button type="submit">修改密码并重新登录</button></form></div>`;
    $('#password-form').onsubmit = e => {
        e.preventDefault();
        if ($('#new-password').value !== $('#confirm-password').value) return toast('两次输入的新密码不一致');
        busy($('button[type=submit]', e.target), async () => {
            await api('/auth/password', {
                method: 'PUT',
                body: {oldPassword: $('#old-password').value, newPassword: $('#new-password').value}
            });
            sessionStorage.removeItem(tokenKey);
            location.replace('/login.html');
        });
    };
}

async function result(user) {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) throw new Error('缺少练习编号');
    const prefix = user.role === 'TEACHER' ? '/admin' : '/student';
    const data = await api(`${prefix}/practices/${encodeURIComponent(id)}/result`);
    const {renderResult} = await import('./student.js?v=20261020-attendance-1');
    renderResult(data, user);
}

const routes = {
    '/student/attendance.html': 'attendance',
    '/admin/schedule.html': 'schedule',
    '/student/schedule.html': 'schedule',
    '/admin/dashboard.html': 'dashboard',
    '/admin/courses.html': 'admin-courses',
    '/admin/course-detail.html': 'course-detail',
    '/admin/practices.html': 'admin-practices',
    '/admin/classes.html': 'classes',
    '/admin/students.html': 'students',
    '/admin/student-detail.html': 'student-detail',
    '/student/home.html': 'home',
    '/student/courses.html': 'courses',
    '/student/practice.html': 'practice',
    '/student/history.html': 'history',
    '/student/wrong.html': 'wrong',
    '/student/analysis.html': 'analysis',
    '/account.html': 'account',
    '/practice-result.html': 'result'
};

async function renderPage() {
    if (page === 'attendance') await studentAttendance();
    else if (page === 'schedule') await schedulePage(currentUser);
    else if (page === 'account') await account(currentUser);
    else if (page === 'result') await result(currentUser);
    else if (currentUser.role === 'TEACHER') await adminPage(page, currentUser);
    else await studentPage(page, currentUser);
}

function syncShell() {
    document.body.dataset.page = page;
    const selected = page === 'course-detail' ? 'admin-courses' : page === 'student-detail' ? 'students' : page;
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', routes[new URL(link.href).pathname] === selected));
    $('.breadcrumb').innerHTML = `${currentUser.role === 'TEACHER' ? '管理工作台' : '学习空间'} <span aria-hidden="true"> / </span> ${esc(titles[page] || '')}`;
}

let navigating = false, queued = null;
let renderedUrl = new URL(location.href);

async function navigate(url, {pop = false} = {}) {
    if (navigating) {
        queued = {url, pop};
        return;
    }
    navigating = true;
    const previous = renderedUrl;
    try {
        if (!pop) history.pushState(null, '', url);
        page = routes[url.pathname];
        syncShell();
        $('#main').setAttribute('aria-busy', 'true');
        if (page === 'course-detail' && previous.pathname === url.pathname && previous.searchParams.get('courseId') === url.searchParams.get('courseId') && $('#course-content')) {
            const {courseDetail} = await import('./course-detail.js?v=20261020-attendance-1');
            await courseDetail({reuse: true});
        } else {
            await renderPage();
            if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView(); else window.scrollTo(0, 0);
        }
        renderedUrl = new URL(location.href);
        refreshAttendanceNotice(currentUser).catch(() => {
        });
    } catch (error) {
        $('#main').innerHTML = errorBox(error.message) + '<button class="secondary" id="retry">重新加载</button>';
        $('#retry').onclick = () => location.reload();
    } finally {
        $('#main')?.removeAttribute('aria-busy');
        navigating = false;
        if (queued) {
            const next = queued;
            queued = null;
            await navigate(next.url, {pop: next.pop});
        }
    }
}

function installNavigation() {
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download') || page === 'answer') return;
        const url = new URL(link.href);
        if (url.origin !== location.origin || !routes[url.pathname] || url.pathname.startsWith('/admin/') && currentUser.role !== 'TEACHER' || url.pathname.startsWith('/student/') && currentUser.role !== 'STUDENT') return;
        if (url.pathname === location.pathname && url.search === location.search) {
            if (url.hash) return;
            event.preventDefault();
            return;
        }
        event.preventDefault();
        navigate(url);
    });
    window.addEventListener('popstate', () => {
        const url = new URL(location.href);
        if (routes[url.pathname]) navigate(url, {pop: true}); else location.reload();
    });
}

async function main() {
    if (page === 'login') {
        await login();
        return;
    }
    if (!sessionStorage.getItem(tokenKey)) {
        location.replace('/login.html');
        return;
    }
    currentUser = await api('/auth/me');
    if (page === 'index') {
        redirect(currentUser);
        return;
    }
    if (location.pathname.startsWith('/admin/') && currentUser.role !== 'TEACHER') {
        redirect(currentUser);
        return;
    }
    if (location.pathname.startsWith('/student/') && currentUser.role !== 'STUDENT') {
        redirect(currentUser);
        return;
    }
    shell(currentUser);
    await renderPage();
    renderedUrl = new URL(location.href);
    installNavigation();
    refreshAttendanceNotice(currentUser).catch(() => {
    });
    let attendancePolling = false;
    setInterval(async () => {
        if (attendancePolling || navigating || document.hidden) return;
        attendancePolling = true;
        try {
            await refreshAttendanceNotice(currentUser);
        } catch {
        } finally {
            attendancePolling = false;
        }
    }, 10000);
}

main().catch(e => {
    const root = $('#main') || $('#login-message') || document.body;
    root.innerHTML = errorBox(e.message) + `<button class="secondary" id="retry">重新加载</button>`;
    $('#retry').onclick = () => location.reload();
});
