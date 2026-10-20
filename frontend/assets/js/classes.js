import {api,query} from './api.js?v=20261020-attendance-1';
import {$,esc,number,heading,backLink,empty,table,toast,busy,courseOptions,stats} from './common.js?v=20261020-attendance-1';

export async function classesPage(options={}){
 const root=options.root||document;
 const $=(selector,scope=root)=>selector==='#main'&&options.root?root:scope.querySelector(selector);
 const listUrl=options.courseId?'/admin/course-detail.html?courseId='+encodeURIComponent(options.courseId)+'&tab=students':'/admin/classes.html';
 const detailUrl=id=>options.courseId?listUrl+'&classId='+encodeURIComponent(id):'/admin/classes.html?id='+encodeURIComponent(id);
 const courses=await api('/courses'),id=options.root?(options.id||null):new URLSearchParams(location.search).get('id');
 let current=null;
 function dialogs(){return `<div id="class-dialogs"><dialog id="class-editor" aria-labelledby="editor-title"><h2 id="editor-title">班级信息</h2><form id="class-form"><div class="field"><label for="class-course">任教课程</label><select id="class-course" required>${courseOptions(courses)}</select></div><div class="field"><label for="class-name">班级名称</label><input id="class-name" maxlength="80" required placeholder="例如：2024级教学二班"></div><div class="field"><label for="class-semester">学期</label><input id="class-semester" maxlength="80" required></div><div class="field"><label for="class-location">上课地点</label><input id="class-location" maxlength="100" placeholder="选填"></div><div class="field"><label for="class-notes">班级备注</label><textarea id="class-notes" maxlength="500" rows="3" placeholder="选填"></textarea></div><div class="modal-actions"><button type="button" id="cancel-class" class="secondary">取消</button><button type="submit">保存班级</button></div></form></dialog><dialog id="class-confirm" aria-labelledby="confirm-title"><h2 id="confirm-title"></h2><p id="confirm-message" class="text-wrap"></p><div class="modal-actions"><button id="cancel-confirm" class="secondary">取消</button><button id="run-confirm" class="danger">确认</button></div></dialog></div>`;}
 function wireDialogs(){
  $('#cancel-class').onclick=()=>$('#class-editor').close();$('#cancel-confirm').onclick=()=>$('#class-confirm').close();
  $('#class-form').onsubmit=e=>{e.preventDefault();busy($('button[type=submit]',e.target),async()=>{
   const body={name:$('#class-name').value.trim(),semester:$('#class-semester').value.trim(),location:$('#class-location').value.trim(),notes:$('#class-notes').value.trim()};
   if(!body.name||!body.semester)return toast('请填写班级名称和学期');
   if(!current)body.courseId=$('#class-course').value;
   await api('/admin/classes'+(current?'/'+encodeURIComponent(current.id):''),{method:current?'PUT':'POST',body});
   $('#class-editor').close();toast('班级已保存');if(id)await loadDetail();else await loadList();
  });};
 }
 function edit(row=null){current=row;$('#editor-title').textContent=row?'编辑班级':'新建教学班';$('#class-course').disabled=!!row||!!options.courseId;$('#class-course').value=row?.courseId||$('#filter-course')?.value||courses[0]?.id||'';$('#class-name').value=row?.name||'';$('#class-semester').value=row?.semester||'2026-2027学年第一学期';$('#class-location').value=row?.location||'';$('#class-notes').value=row?.notes||'';$('#class-editor').showModal();}
 function confirm(title,message,action){$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#class-confirm').showModal();$('#run-confirm').onclick=()=>busy($('#run-confirm'),async()=>{await action();$('#class-confirm').close();});}
 async function dissolve(row){confirm('解散教学班',`确定解散《${row.courseName}》的“${row.name}”吗？班级成员将移出班级，课程选课和练习记录会保留。`,async()=>{await api('/admin/classes/'+encodeURIComponent(row.id),{method:'DELETE'});toast('班级已解散');if(id)location.href=listUrl;else await loadList();});}
 async function loadList(){
  const rows=await api('/admin/classes'+query({courseId:$('#filter-course').value}));
  $('#class-summary').innerHTML=stats([{label:'当前教学班',value:rows.length,unit:'个'},{label:'涉及课程',value:new Set(rows.map(r=>r.courseId)).size,unit:'门'},{label:'在班学生',value:rows.reduce((sum,r)=>sum+Number(r.studentCount),0),unit:'人次',note:'同一学生参加不同课程分别计数'}]);
  $('#class-list').innerHTML=rows.length?`<div class="grid three">${rows.map(row=>`<article class="card teaching-class-card"><div class="row between"><span class="badge">${esc(row.courseName)}</span><span class="badge good">${number(row.studentCount)} 人</span></div><h2><a class="card-main-link" href="${esc(detailUrl(row.id))}">${esc(row.name)}</a></h2><p class="muted small-text">${esc(row.semester)}</p><p class="small-text">上课地点：${esc(row.location||'待安排')}</p><p class="muted small-text text-wrap">${esc(row.notes||'暂无班级备注')}</p><div class="course-actions"><a class="button small" href="${esc(detailUrl(row.id))}">管理学生 →</a><button class="text small" data-edit="${esc(row.id)}">编辑班级</button></div></article>`).join('')}</div>`:empty('还没有教学班','为负责的课程新建一个班级，再添加已经选课的学生。');
  root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(rows.find(r=>r.id===b.dataset.edit)));
 }
 async function loadDetail(){
  const row=await api('/admin/classes/'+encodeURIComponent(id));
  if(options.courseId&&String(row.courseId)!==String(options.courseId))throw new Error('该班级不属于当前课程');
  $('#class-info').innerHTML=`<div class="card"><div class="row between"><div><span class="badge">${esc(row.courseName)}</span><h2 style="margin-top:12px">${esc(row.name)}</h2><p class="muted">${esc(row.semester)} · ${esc(row.location||'上课地点待安排')}</p><p class="small-text text-wrap">${esc(row.notes||'暂无班级备注')}</p></div><div class="row"><button id="edit-current" class="secondary">编辑班级</button><button id="dissolve-class" class="danger">解散班级</button></div></div></div>`;
  $('#edit-current').onclick=()=>edit(row);$('#dissolve-class').onclick=()=>dissolve(row);
  const students=await api(`/admin/classes/${encodeURIComponent(id)}/students`+query({keyword:$('#roster-keyword').value.trim()}));
  $('#roster-count').textContent=`班级共 ${number(row.studentCount)} 人 · 当前显示 ${students.length} 人`;
  $('#roster').innerHTML=students.length?table(['学号','姓名','账号状态','操作'],students.map(s=>`<tr><td>${esc(s.username)}</td><td>${esc(s.realName)}</td><td><span class="badge ${s.enabled?'good':'weak'}">${s.enabled?'启用':'停用'}</span></td><td><div class="row"><a href="/admin/student-detail.html?id=${esc(s.id)}&amp;courseId=${esc(row.courseId)}">查看学习</a><button class="text small" data-remove="${esc(s.id)}">移出班级</button></div></td></tr>`)):empty('没有匹配的学生','可清空搜索条件，或添加已选课且尚未分班的学生。');
  root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const s=students.find(s=>s.id===b.dataset.remove);confirm('移出班级',`确定将 ${s.realName}（${s.username}）移出本班吗？这不会取消选课或删除练习记录。`,async()=>{await api(`/admin/classes/${encodeURIComponent(id)}/students/${encodeURIComponent(s.id)}`,{method:'DELETE'});toast('学生已移出班级');await loadDetail();});});
 }
 if(!id){
  $('#main').innerHTML=(options.root?`<div class="card-header"><div><h2>课程班级与学生</h2><p class="muted small-text">选择班级管理学生名单，或新建本课程的教学班。</p></div><button id="new-class">＋ 新建班级</button></div>`:heading('TEACHING CLASSES','任教班级','按课程组织教学班，管理班级信息与学生名单。','<button id="new-class">＋ 新建班级</button>'))+`<div class="filters"><label for="filter-course">任教课程</label><select id="filter-course">${courseOptions(courses,true)}</select></div><div id="class-summary"></div><div class="spacer"></div><div id="class-list"></div>`+dialogs();wireDialogs();if(options.courseId){$('#filter-course').value=options.courseId;$('#filter-course').disabled=true;}$('#new-class').onclick=()=>edit();$('#filter-course').onchange=()=>loadList().catch(e=>toast(e.message));await loadList();return;
 }
 $('#main').innerHTML=heading('CLASS ROSTER','班级管理','每名学生在同一门课程中只能加入一个教学班。','',backLink(listUrl,options.root?'返回课程班级':'返回任教班级'))+`<div id="class-info"></div><div class="card"><div class="card-header"><div><h2>班级学生</h2><span id="roster-count" class="muted small-text"></span></div><button id="add-members">＋ 添加学生</button></div><form id="roster-search" class="filters"><label class="visually-hidden" for="roster-keyword">搜索学号或姓名</label><input id="roster-keyword" maxlength="100" placeholder="搜索学号或姓名"><button class="secondary">搜索</button></form><div id="roster"></div></div>`+dialogs()+`<dialog id="member-picker" class="catalog-dialog" aria-labelledby="picker-title"><h2 id="picker-title">添加班级学生</h2><p class="muted small-text">仅显示已加入本课程、账号启用且尚未分班的学生。需要转班时，先从原班移出。</p><form id="candidate-search" class="filters"><input id="candidate-keyword" maxlength="100" placeholder="搜索学号或姓名" aria-label="搜索可添加学生"><button class="secondary">搜索</button></form><div id="candidates"></div><div class="modal-actions"><button id="cancel-members" class="secondary">取消</button><button id="save-members">添加所选学生</button></div></dialog>`;
 wireDialogs();$('#roster-search').onsubmit=e=>{e.preventDefault();loadDetail().catch(e=>toast(e.message));};
 const selected=new Set();
 async function loadCandidates(){
  const rows=await api(`/admin/classes/${encodeURIComponent(id)}/candidates`+query({keyword:$('#candidate-keyword').value.trim()}));
  $('#candidates').innerHTML=rows.length?`<div class="row between"><button id="select-candidates" class="text small">选择当前全部</button><span class="muted small-text">当前找到 ${rows.length} 名学生</span></div>`+table(['选择','学号','姓名'],rows.map(s=>`<tr><td><input type="checkbox" data-select-student="${esc(s.id)}" aria-label="选择${esc(s.realName)} ${esc(s.username)}" ${selected.has(s.id)?'checked':''}></td><td>${esc(s.username)}</td><td>${esc(s.realName)}</td></tr>`)):empty('暂无可添加学生','所有已选课的学生可能已经分班；可先从其他班移出，或让学生加入课程。');
  root.querySelectorAll('[data-select-student]').forEach(input=>input.onchange=()=>{if(input.checked)selected.add(input.dataset.selectStudent);else selected.delete(input.dataset.selectStudent);});
  $('#select-candidates')?.addEventListener('click',()=>{root.querySelectorAll('[data-select-student]').forEach(input=>{input.checked=true;selected.add(input.dataset.selectStudent);});});
 }
 $('#add-members').onclick=()=>{selected.clear();$('#candidate-keyword').value='';$('#member-picker').showModal();loadCandidates().catch(e=>toast(e.message));};$('#cancel-members').onclick=()=>$('#member-picker').close();$('#candidate-search').onsubmit=e=>{e.preventDefault();loadCandidates().catch(e=>toast(e.message));};
 $('#save-members').onclick=()=>{if(!selected.size)return toast('请先选择学生');busy($('#save-members'),async()=>{await api(`/admin/classes/${encodeURIComponent(id)}/students`,{method:'POST',body:{studentIds:[...selected]}});$('#member-picker').close();toast('学生已添加到班级');await loadDetail();});};
 await loadDetail();
}
