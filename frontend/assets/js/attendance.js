import {api} from './api.js?v=20261020-attendance-1';
import {$, busy, empty, esc, heading, number, table, time, toast} from './common.js?v=20261020-attendance-1';

const active = row => row.active === true || Number(row.active) === 1;
let teacherPoll = null;

export async function teacherAttendance(root, courseId, courseName) {
    root.innerHTML = `<div class="card"><div class="card-header"><div><h2>发布课程签到</h2><p class="muted small-text">发送给发布时已加入本课程的启用学生账号，名单固定保留。</p></div><span class="badge">${esc(courseName)}</span></div><form id="publish-attendance" class="attendance-publish"><div class="field"><label for="attendance-title">签到标题</label><input id="attendance-title" maxlength="80" required value="课堂签到"></div><div class="field"><label for="attendance-mode">签到方式</label><select id="attendance-mode"><option value="NORMAL">普通签到 · 点击即可完成</option><option value="CODE">口令签到 · 输入四位数字</option></select></div><div class="field"><label for="attendance-minutes">有效时长</label><select id="attendance-minutes"><option value="5">5 分钟</option><option value="10" selected>10 分钟</option><option value="15">15 分钟</option><option value="30">30 分钟</option><option value="60">60 分钟</option></select></div><button type="submit">发布签到</button></form></div><div class="card-header"><h2>已发布签到</h2><button id="refresh-attendance" class="secondary small">刷新</button></div><div id="teacher-attendance-list"></div><dialog id="attendance-roster-dialog" class="catalog-dialog" aria-labelledby="attendance-roster-title"><div class="attendance-roster-header"><h2 id="attendance-roster-title">签到名单</h2><button id="close-roster" class="roster-close" type="button" aria-label="关闭签到名单" title="关闭"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div id="attendance-roster"></div></dialog>`;
    const list = root.querySelector('#teacher-attendance-list');
    let rosterId = null;

    async function roster(id) {
        rosterId = id;
        const rows = await api(`/admin/attendance/${encodeURIComponent(id)}/students`);
        if (!root.isConnected) return;
        root.querySelector('#attendance-roster').innerHTML = table(['学号', '姓名', '状态', '签到时间'], rows.map(row => `<tr><td>${esc(row.username)}</td><td>${esc(row.realName)}</td><td><span class="badge ${row.signedAt ? 'good' : ''}">${row.signedAt ? '已签到' : '未签到'}</span></td><td>${esc(time(row.signedAt))}</td></tr>`));
    }

    async function load() {
        const rows = await api(`/admin/courses/${encodeURIComponent(courseId)}/attendance`);
        if (!root.isConnected || !list.isConnected) return;
        const signature = JSON.stringify(rows);
        if (list.dataset.signature === signature) {
            if (root.querySelector('#attendance-roster-dialog').open && rosterId) await roster(rosterId);
            return;
        }
        list.dataset.signature = signature;
        list.innerHTML = rows.length ? rows.map(row => `<article class="card attendance-card"><div class="row between"><div><span class="badge ${active(row) ? 'good' : ''}">${active(row) ? '进行中' : '已结束'}</span> <span class="muted small-text">${row.mode === 'CODE' ? '口令签到' : '普通签到'}</span><h2>${esc(row.title)}</h2><p class="muted small-text">发布于 ${esc(time(row.createdAt))} · 截止 ${esc(time(row.expiresAt))}</p></div><div class="attendance-count"><strong>${number(row.signedCount)}</strong><span> / ${number(row.expectedCount)} 人签到</span></div></div>${row.mode === 'CODE' && active(row) ? `<div class="attendance-code"><span>向学生展示此口令</span><strong>${esc(row.passcode)}</strong><small>学生输入四位数字完成签到</small></div>` : ''}<div class="row"><button class="secondary small" data-roster="${esc(row.id)}">查看签到名单</button>${active(row) ? `<button class="text small" data-close="${esc(row.id)}">结束签到</button>` : ''}</div></article>`).join('') : empty('还没有发布签到', '选择普通签到或口令签到，发布后学生会收到提醒。');
        list.querySelectorAll('[data-roster]').forEach(button => button.onclick = () => busy(button, async () => {
            await roster(button.dataset.roster);
            root.querySelector('#attendance-roster-dialog').showModal();
        }));
        list.querySelectorAll('[data-close]').forEach(button => button.onclick = () => {
            if (confirm('确定结束本次签到吗？结束后学生将无法继续签到。')) busy(button, async () => {
                await api(`/admin/attendance/${encodeURIComponent(button.dataset.close)}/close`, {
                    method: 'POST',
                    body: {}
                });
                toast('签到已结束');
                await load();
            });
        });
        if (root.querySelector('#attendance-roster-dialog').open && rosterId) await roster(rosterId);
    }

    root.querySelector('#publish-attendance').onsubmit = event => {
        event.preventDefault();
        busy(event.submitter, async () => {
            await api(`/admin/courses/${encodeURIComponent(courseId)}/attendance`, {
                method: 'POST',
                body: {
                    title: root.querySelector('#attendance-title').value.trim(),
                    mode: root.querySelector('#attendance-mode').value,
                    minutes: Number(root.querySelector('#attendance-minutes').value)
                }
            });
            toast('签到已发布，学生可在课程签到中查看');
            await load();
        });
    };
    root.querySelector('#close-roster').onclick = () => root.querySelector('#attendance-roster-dialog').close();
    root.querySelector('#refresh-attendance').onclick = () => load().catch(error => toast(error.message));
    teacherPoll = async () => {
        if (list.isConnected) await load(); else teacherPoll = null;
    };
    await load();
}

function renderStudentRows(rows) {
    const list = $('#student-attendance-list');
    if (!list) return;
    const signature = JSON.stringify(rows);
    if (list.dataset.signature === signature) return;
    list.dataset.signature = signature;
    list.innerHTML = rows.length ? rows.map(row => `<article class="card attendance-card"><div class="row between"><div><span class="badge">${esc(row.courseName)}</span> <span class="badge ${row.signedAt ? 'good' : ''}">${row.signedAt ? '已签到' : active(row) ? '待签到' : '已结束'}</span><h2>${esc(row.title)}</h2><p class="muted small-text">${row.mode === 'CODE' ? '口令签到' : '普通签到'} · 截止 ${esc(time(row.expiresAt))}</p>${row.signedAt ? `<p class="small-text">签到时间：${esc(time(row.signedAt))}</p>` : ''}</div>${!row.signedAt && active(row) ? `<button data-sign="${esc(row.id)}" data-mode="${esc(row.mode)}">${row.mode === 'CODE' ? '输入口令' : '立即签到'}</button>` : ''}</div></article>`).join('') : empty('暂无课程签到', '老师发布签到后会出现在这里。');
    list.querySelectorAll('[data-sign]').forEach(button => button.onclick = () => {
        if (button.dataset.mode === 'CODE') {
            $('#signin-session').value = button.dataset.sign;
            $('#signin-passcode').value = '';
            $('#signin-error').textContent = '';
            $('#signin-dialog').showModal();
            $('#signin-passcode').focus();
        } else busy(button, async () => {
            await api(`/student/attendance/${encodeURIComponent(button.dataset.sign)}/sign`, {
                method: 'POST',
                body: {}
            });
            toast('签到成功');
            await refreshAttendanceNotice({role: 'STUDENT'});
        });
    });
}

export async function studentAttendance() {
    $('#main').innerHTML = heading('COURSE ATTENDANCE', '课程签到', '接收已选课程的签到通知；普通签到直接点击，口令签到输入教师展示的四位数字。', '<button id="refresh-student-attendance" class="secondary">刷新</button>') + '<div id="student-attendance-list"></div><dialog id="signin-dialog" aria-labelledby="signin-title"><h2 id="signin-title">输入签到口令</h2><p class="muted">请输入教师展示的四位数字，包含开头的 0。</p><form id="signin-form"><input id="signin-session" type="hidden"><label for="signin-passcode" class="visually-hidden">四位数字口令</label><input id="signin-passcode" class="signin-input" inputmode="numeric" autocomplete="off" pattern="[0-9]{4}" minlength="4" maxlength="4" required><p id="signin-error" class="signin-error" role="alert"></p><div class="modal-actions"><button id="cancel-signin" type="button" class="secondary">取消</button><button type="submit">确认签到</button></div></form></dialog>';
    $('#cancel-signin').onclick = () => $('#signin-dialog').close();
    $('#refresh-student-attendance').onclick = () => refreshAttendanceNotice({role: 'STUDENT'}).catch(error => toast(error.message));
    $('#signin-form').onsubmit = event => {
        event.preventDefault();
        busy(event.submitter, async () => {
            try {
                await api(`/student/attendance/${encodeURIComponent($('#signin-session').value)}/sign`, {
                    method: 'POST',
                    body: {passcode: $('#signin-passcode').value}
                });
                $('#signin-dialog').close();
                toast('签到成功');
                await refreshAttendanceNotice({role: 'STUDENT'});
            } catch (error) {
                $('#signin-error').textContent = error.message;
            }
        });
    };
    await refreshAttendanceNotice({role: 'STUDENT'});
}

export async function refreshAttendanceNotice(user) {
    if (user.role === 'TEACHER') {
        if (teacherPoll) await teacherPoll();
        return;
    }
    const rows = await api('/student/attendance');
    const pending = rows.filter(row => active(row) && !row.signedAt);
    const link = document.querySelector('a.nav-link[href="/student/attendance.html"]');
    if (link) {
        const badge = link.querySelector('.attendance-nav-badge');
        if (!pending.length) badge?.remove(); else if (badge) badge.textContent = String(pending.length); else link.insertAdjacentHTML('beforeend', `<span class="attendance-nav-badge">${pending.length}</span>`);
    }
    const notice = $('#attendance-notice');
    if (notice && notice.dataset.pending !== JSON.stringify(pending)) {
        notice.dataset.pending = JSON.stringify(pending);
        notice.innerHTML = pending.length ? `<a class="attendance-notice" href="/student/attendance.html"><span><strong>你有 ${pending.length} 项待签到</strong><small>${esc([...new Set(pending.map(row => row.courseName))].join('、'))}</small></span><span>前往签到 →</span></a>` : '';
    }
    renderStudentRows(rows);
}
