import {api,query} from './api.js?v=20261020-attendance-1';
import {$,esc,heading,empty,number} from './common.js?v=20261020-attendance-1';

const periods=[['08:20','10:00'],['10:20','12:00'],['14:00','15:40'],['16:00','17:40']];
const weekdays=['周一','周二','周三','周四','周五','周六','周日'];
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function monday(date){const result=new Date(date);result.setHours(0,0,0,0);result.setDate(result.getDate()-(result.getDay()+6)%7);return result;}
function shift(date,days){const result=new Date(date);result.setDate(result.getDate()+days);return result;}
function monthDay(date){return `${date.getMonth()+1}/${date.getDate()}`;}
export async function schedulePage(user){
 const rows=await api('/schedule');
 const today=new Date(),params=new URLSearchParams(location.search),requested=params.get('week');
 const parsed=requested&&/^\d{4}-\d{2}-\d{2}$/.test(requested)?new Date(requested+'T12:00:00'):today;
 let week=monday(Number.isNaN(parsed.getTime())?today:parsed);
 const teacher=user.role==='TEACHER';
 $('#main').innerHTML=heading('WEEKLY TIMETABLE','我的课表',teacher?'查看你负责课程的每周上课安排。':'按你已加入的课程显示，选课或退课后自动更新。')+`<section class="timetable-card" aria-labelledby="week-title"><div class="timetable-toolbar"><div><span class="eyebrow">每周固定课表</span><h2 id="week-title"></h2><p id="schedule-summary" class="muted small-text"></p></div><div class="timetable-controls"><button id="week-previous" class="secondary" aria-label="上一周">‹</button><button id="week-current" class="secondary">本周</button><button id="week-next" class="secondary" aria-label="下一周">›</button><label class="visually-hidden" for="week-date">选择课表日期</label><input id="week-date" type="date" aria-label="选择课表日期"></div></div><div class="timetable-scroll" tabindex="0" aria-label="每周课程表，可横向滚动"><div id="timetable"></div></div><div id="schedule-empty"></div><div class="timetable-footer"><span>每门课每周 2 次 · 周末不排课</span><span>课程按周重复，日期切换用于查看对应周次。</span></div></section><dialog id="schedule-dialog" aria-labelledby="schedule-dialog-title"><div id="schedule-dialog-content"></div><div class="modal-actions"><button id="close-schedule" class="secondary">关闭</button></div></dialog>`;
 const courseIds=[...new Set(rows.map(row=>row.courseId))];
 const colors=new Map(courseIds.map(id=>[id,(Number(id)-1)%5]));
 function render(){
  const days=weekdays.map((name,index)=>({name,date:shift(week,index)}));
  $('#week-title').textContent=`${week.getFullYear()} 年 ${monthDay(week)} — ${monthDay(shift(week,6))}`;
  $('#week-date').value=dateKey(week);
  $('#schedule-summary').textContent=`${courseIds.length} 门${teacher?'任教':'已选'}课程 · 每周 ${number(rows.length)} 次课`;
  $('#timetable').innerHTML=`<table class="timetable"><thead><tr><th scope="col" class="time-heading">时间</th>${days.map((day,index)=>`<th scope="col" class="${dateKey(day.date)===dateKey(today)?'is-today ':''}${index>4?'is-weekend':''}"><span>${day.name}</span><small>${monthDay(day.date)}${dateKey(day.date)===dateKey(today)?' · 今天':''}</small></th>`).join('')}</tr></thead><tbody>${periods.map((times,index)=>`<tr><th scope="row" class="period-label"><span>第 ${index+1} 时段</span><strong>${times[0]}</strong><small>—</small><strong>${times[1]}</strong></th>${days.map((day,dayIndex)=>{const lesson=rows.find(row=>Number(row.weekday)===dayIndex+1&&Number(row.period)===index+1);return `<td class="${dayIndex>4?'is-weekend':''}">${lesson?`<button class="timetable-lesson lesson-color-${colors.get(lesson.courseId)}" data-lesson="${esc(lesson.id)}" aria-label="${esc(lesson.courseName)}，${day.name} ${times.join(' 至 ')}，${esc(lesson.location)}"><strong>${esc(lesson.courseName)}</strong><span>${esc(lesson.location)}</span><small>${esc(lesson.teacherName)}</small><span class="lesson-repeat">每周</span></button>`:dayIndex>4&&index===0?'<span class="weekend-rest">休息</span>':''}</td>`;}).join('')}</tr>`).join('')}</tbody></table>`;
  $('#schedule-empty').innerHTML=rows.length?'':empty(teacher?'暂无任教课程安排':'你的课表还是空的',teacher?'负责课程排课后会在这里显示。':'加入课程后，这里会自动显示对应课表。',teacher?'':'<a class="button secondary" href="/student/courses.html">去选课 →</a>');
  $('#timetable').querySelectorAll('[data-lesson]').forEach(button=>button.onclick=()=>{
   const lesson=rows.find(row=>String(row.id)===button.dataset.lesson),times=periods[Number(lesson.period)-1];
   $('#schedule-dialog-content').innerHTML=`<span class="eyebrow">课程安排</span><h2 id="schedule-dialog-title">${esc(lesson.courseName)}</h2><dl class="lesson-details"><dt>上课时间</dt><dd>${weekdays[Number(lesson.weekday)-1]} ${times.join(' — ')}</dd><dt>上课地点</dt><dd>${esc(lesson.location)}</dd><dt>任课教师</dt><dd>${esc(lesson.teacherName)}</dd><dt>重复规则</dt><dd>每周固定上课，周末休息</dd></dl><a class="button" href="${esc(teacher?'/admin/course-detail.html'+query({courseId:lesson.courseId}):'/student/practice.html'+query({courseId:lesson.courseId}))}">${teacher?'查看课程详情':'进入课程练习'} →</a>`;
   $('#schedule-dialog').showModal();
  });
 }
 function changeWeek(date){week=monday(date);const url=new URL(location.href);url.searchParams.set('week',dateKey(week));history.replaceState(null,'',url);render();}
 $('#week-previous').onclick=()=>changeWeek(shift(week,-7));$('#week-next').onclick=()=>changeWeek(shift(week,7));$('#week-current').onclick=()=>changeWeek(today);
 $('#week-date').onchange=()=>{if($('#week-date').value){const date=new Date($('#week-date').value+'T12:00:00');if(!Number.isNaN(date.getTime()))changeWeek(date);}};
 $('#close-schedule').onclick=()=>$('#schedule-dialog').close();render();
}
