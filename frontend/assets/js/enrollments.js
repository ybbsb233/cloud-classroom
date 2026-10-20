import {api,query} from './api.js?v=20261020-classes-4';
import {$,esc,toast,busy,heading,empty,number} from './common.js?v=20261020-classes-4';

export async function myCourses(){
 $('#main').innerHTML=heading('MY COURSES','我的课程','在这里管理你加入的课程，查看任课教师并进入课程学习。','<button id="open-catalog">＋ 加入课程</button>')+
 `<div class="notice">退课不会删除原有练习和作答记录；重新加入后可继续查看。退课期间不能开始或提交该课程练习。</div><div id="enrolled-list" aria-live="polite"></div>
 <dialog id="catalog-dialog" class="catalog-dialog" aria-labelledby="catalog-title"><div class="card-header"><div><h2 id="catalog-title">查找已开课程</h2><p class="muted small-text">通过课程名称、介绍或教师姓名搜索</p></div><button id="close-catalog" class="secondary small" aria-label="关闭查找课程">关闭</button></div><form id="catalog-search" class="filters"><label class="visually-hidden" for="catalog-keyword">搜索课程或教师</label><input id="catalog-keyword" maxlength="100" placeholder="搜索课程名称或任课教师"><button type="submit">搜索</button></form><div id="catalog-results" aria-live="polite"></div></dialog>
 <dialog id="leave-dialog" aria-labelledby="leave-title"><h2 id="leave-title">确认退出课程</h2><p id="leave-description" class="text-wrap"></p><p class="muted small-text">练习记录将保留，重新加入后恢复查看。</p><div class="modal-actions"><button id="cancel-leave" class="secondary">暂不退课</button><button id="confirm-leave" class="danger">确认退课</button></div></dialog>`;
 let mine=[],leaving=null,searchVersion=0;
 async function loadMine(){
  mine=await api('/courses');
  $('#enrolled-list').innerHTML=mine.length?`<div class="section-title"><h2>已加入 ${mine.length} 门课程</h2><span class="muted small-text">自主选择，按需学习</span></div><div class="grid three">${mine.map(c=>`<article class="card enrollment-card"><div class="row between"><span class="course-icon">课</span><span class="badge good">已加入</span></div><h2><a class="card-main-link" href="/student/practice.html?courseId=${esc(c.id)}" aria-label="进入${esc(c.name)}课程学习">${esc(c.name)}</a></h2><p class="muted">任课教师 · ${esc(c.teacherName)}</p><p class="small-text course-description">${esc(c.description||'按章节练习，持续积累学习反馈。')}</p><p class="muted small-text">${number(c.questionCount)} 道题 · ${number(c.studentCount)} 名在课学生</p><div class="course-actions"><a class="button small" href="/student/practice.html?courseId=${esc(c.id)}">进入学习 →</a><button class="text small" data-leave="${esc(c.id)}">退出课程</button></div></article>`).join('')}</div>`:empty('还没有加入课程','搜索已开课程，找到想学习的内容。','<button id="empty-join">查找课程</button>');
  $('#empty-join')?.addEventListener('click',openCatalog);
  document.querySelectorAll('[data-leave]').forEach(button=>button.onclick=()=>{leaving=mine.find(c=>c.id===button.dataset.leave);$('#leave-description').textContent=`确定退出《${leaving.name}》吗？`;
   $('#leave-dialog').showModal();});
 }
 async function search(){
  const version=++searchVersion;
  $('#catalog-results').innerHTML='<div class="loading">正在查找课程…</div>';
  try{
   const rows=await api('/student/courses/catalog'+query({keyword:$('#catalog-keyword').value.trim()}));
   if(version!==searchVersion)return;
   $('#catalog-results').innerHTML=rows.length?`<p class="small-text muted">找到 ${rows.length} 门已开课程</p>${rows.map(c=>{const joined=Number(c.enrolled)===1;return `<article class="catalog-row"><div><h3>${esc(c.name)}</h3><p class="small-text muted">${esc(c.teacherName)} · ${number(c.studentCount)} 名学生 · ${number(c.questionCount)} 道题</p><p class="small-text course-description">${esc(c.description||'')}</p></div><button data-join="${esc(c.id)}" class="small ${joined?'secondary':''}" ${joined?'disabled':''}>${joined?'已加入':'加入课程'}</button></article>`;}).join('')}`:empty('没有找到匹配课程','试试其他课程名称或教师姓名，清空搜索可查看全部已开课程。');
   document.querySelectorAll('[data-join]').forEach(button=>button.onclick=()=>busy(button,async()=>{await api(`/student/courses/${encodeURIComponent(button.dataset.join)}/join`,{method:'POST'});toast('已加入课程');await loadMine();await search();}));
  }catch(error){if(version===searchVersion){$('#catalog-results').innerHTML=empty('课程加载失败',error.message);}}
 }
 function openCatalog(){$('#catalog-dialog').showModal();search();}
 $('#open-catalog').onclick=openCatalog;
 $('#close-catalog').onclick=()=>{$('#catalog-dialog').close();searchVersion++;};
 $('#catalog-search').onsubmit=e=>{e.preventDefault();search();};
 $('#cancel-leave').onclick=()=>$('#leave-dialog').close();
 $('#confirm-leave').onclick=()=>busy($('#confirm-leave'),async()=>{await api(`/student/courses/${encodeURIComponent(leaving.id)}`,{method:'DELETE'});$('#leave-dialog').close();toast('已退出课程，学习记录已保留');await loadMine();});
 await loadMine();
}
