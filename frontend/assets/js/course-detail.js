import {teacherAttendance} from './attendance.js?v=20261020-attendance-1';
import {api,query} from './api.js?v=20261020-attendance-1';
import {$,esc,number,pct,time,heading,backLink,stats,table,empty,pagination,toast,bar,badge} from './common.js?v=20261020-attendance-1';
import {classesPage} from './classes.js?v=20261020-attendance-1';

export async function courseDetail({reuse=false}={}){
 const params=new URLSearchParams(location.search),courseId=params.get('courseId');
 const courses=await api('/courses'),course=courses.find(c=>String(c.id)===courseId);
 if(!course)throw new Error('课程不存在或无权访问');
 const [chapters,overview]=await Promise.all([api(`/courses/${encodeURIComponent(courseId)}/chapters`),api('/admin/summary')]);
 const summary=overview.courses.find(c=>String(c.courseId)===courseId);
 const tabs={chapters:'所有章节',analysis:'学习分析',history:'练习记录',students:'课程学生',attendance:'课程签到'};
 const tab=tabs[params.get('tab')]?params.get('tab'):'chapters';
 if(!reuse)$('#main').innerHTML=heading('COURSE DETAILS',course.name,course.description||'查看本课程的教学内容与学生学习情况。','',backLink('/admin/courses.html','返回课程概览'))+stats([{label:'课程章节',value:chapters.length,unit:'章'},{label:'题库题量',value:number(course.questionCount),unit:'题'},{label:'选课学生',value:number(course.studentCount),unit:'人'},{label:'累计正确率',value:pct(summary?.accuracy),note:`已提交 ${number(summary?.practiceCount)} 次练习`}])+`<div class="spacer"></div><nav class="tabs" aria-label="课程详情">${Object.entries(tabs).map(([key,label])=>`<a class="button ${key===tab?'':'secondary'}" ${key===tab?'aria-current="page"':''} href="${esc('/admin/course-detail.html'+query({courseId,tab:key}))}">${label}</a>`).join('')}</nav><div id="course-content"></div>`;
 document.querySelectorAll('nav[aria-label="课程详情"] a').forEach(link=>{
  const active=new URL(link.href).searchParams.get('tab')===tab;
  link.classList.toggle('secondary',!active);
  if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 });
 const content=$('#course-content');
 if(tab==='attendance'){await teacherAttendance(content,courseId,course.name);
 }else if(tab==='chapters'){
  const points=await api(`/courses/${encodeURIComponent(courseId)}/knowledge-points`);
  content.innerHTML=chapters.length?`<div class="grid two">${chapters.map((c,i)=>`<article class="card"><span class="badge">第 ${i+1} 章</span><h2>${esc(c.name)}</h2><p class="muted small-text">${number(c.questionCount)} 道题 · 固定章节练习</p><div class="row">${points.filter(k=>String(k.chapterId)===String(c.id)).map(k=>`<span class="badge">${esc(k.name)}</span>`).join('')}</div></article>`).join('')}</div>`:empty('暂无章节','本课程还没有配置章节。');
 }else if(tab==='students'){
  await classesPage({root:content,courseId,id:params.get('classId')});
 }else if(tab==='analysis'){
  const rows=await api('/admin/knowledge-analysis'+query({courseId}));
  content.innerHTML=`<div class="card"><h2>知识点掌握情况</h2><p class="muted small-text">取每位学生每道题最近一次结果；参与学生或有效作答组合不足 3 时，不判断整体掌握等级。</p>${rows.length?table(['知识点','题库题量','参与学生','有效作答组合','正确率','掌握情况'],rows.map(r=>`<tr><td>${esc(r.knowledgeName)}</td><td>${number(r.bankCount)}</td><td>${number(r.participantCount)}</td><td>${number(r.questionCount)}</td><td>${pct(r.accuracy)}${bar(r.accuracy)}</td><td>${badge(r.level)}</td></tr>`)):empty('暂无分析数据','学生提交练习后可查看分析。')}</div><div class="card"><h2>学生练习情况</h2><div id="course-students"></div><div id="course-pagination"></div></div>`;
  let page=1,pageSize=10;
  async function load(){const data=await api('/admin/course-students'+query({courseId,page,pageSize}));$('#course-students').innerHTML=data.rows.length?table(['学号','姓名','练习次数','累计题量','正确率','详情'],data.rows.map(r=>`<tr><td>${esc(r.username)}</td><td>${esc(r.realName)}</td><td>${number(r.practiceCount)}</td><td>${number(r.answerCount)}</td><td>${pct(r.accuracy)}</td><td><a href="${esc('/admin/student-detail.html'+query({id:r.studentId,courseId}))}">查看学习 →</a></td></tr>`)):empty('暂无学生学习记录','学生提交练习后可查看。');pagination($('#course-pagination'),data.total,page,pageSize,p=>{page=p;load().catch(e=>toast(e.message));},size=>{pageSize=size;page=1;load().catch(e=>toast(e.message));});}await load();
 }else{
  content.innerHTML='<div class="card"><h2>本课程练习记录</h2><div id="course-history"></div><div id="course-pagination"></div></div>';
  let page=1,pageSize=10;
  async function load(){const data=await api('/admin/practices'+query({courseId,page,pageSize}));$('#course-history').innerHTML=data.rows.length?table(['学生','章节 / 类型','提交时间','得分','正确率','操作'],data.rows.map(r=>`<tr><td>${esc(r.studentName)}<span class="sub">${esc(r.username)}</span></td><td>${esc(r.chapterName||'自主练习')}<span class="sub">${r.sourceType==='CHAPTER'?'固定章节练习':r.sourceType==='WRONG'?'错题重练':'自主随机练习'}</span></td><td>${esc(time(r.submittedAt))}</td><td>${number(r.correctCount)} / ${number(r.questionCount)}</td><td>${pct(r.accuracy)}</td><td><a href="/practice-result.html?id=${esc(r.practiceId)}">查看结果 →</a></td></tr>`)):empty('暂无练习记录','本课程的已提交练习将在这里展示。');pagination($('#course-pagination'),data.total,page,pageSize,p=>{page=p;load().catch(e=>toast(e.message));},size=>{pageSize=size;page=1;load().catch(e=>toast(e.message));});}await load();
 }
}
