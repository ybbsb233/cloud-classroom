"""Real HTTP teaching-class lifecycle test; restores the moved student's class."""
import os
import time
from verify_enrollment import call,login,course_ids

t1,t2=login('teacher01'),login('teacher02')
student=login('20240020',os.environ.get('TEST_STUDENT_PASSWORD','123456'))
first=call('/admin/classes',t1)
second=call('/admin/classes',t2)
assert all(r['courseId'] in {'1','2'} for r in first)
assert all(r['courseId'] in {'3','4','5'} for r in second)
source=next(r for r in first if r['courseId']=='1' and r['name']=='2024级教学一班')
sid=call('/auth/me',student)['id']
original_members={r['id'] for r in call('/admin/classes/'+source['id']+'/students',t1)}
assert sid in original_members,'Test student must initially be in the default math class'
other=second[0]['id']
call('/admin/classes',student,expected=403)
call('/admin/classes/'+other,t1,expected=404)
call('/admin/classes/'+other+'/students',t1,expected=404)
call('/admin/classes/'+other+'/candidates',t1,expected=404)
call('/admin/classes/'+other+'/students',t1,method='POST',body={'studentIds':[sid]},expected=404)
call('/admin/classes/'+other,t1,method='DELETE',expected=404)
data={'courseId':'1','name':'班级接口验证-'+str(int(time.time())),'semester':'2026-2027学年第一学期','location':'测试教室','notes':'接口验证，结束后解散'}
call('/admin/classes',t1,method='POST',body={**data,'courseId':'3'},expected=404)
call('/admin/classes',t1,method='POST',body={**data,'name':'  '},expected=400)
created=call('/admin/classes',t1,method='POST',body=data)
cid=created['id']
active=True
try:
    assert created['studentCount']==0
    call('/admin/classes',t1,method='POST',body=data,expected=409)
    updated=call('/admin/classes/'+cid,t1,method='PUT',body={k:v for k,v in {**data,'location':'更新教室'}.items() if k!='courseId'})
    assert updated['location']=='更新教室'
    call('/admin/classes/'+cid,t2,method='PUT',body={k:v for k,v in data.items() if k!='courseId'},expected=404)
    call('/admin/classes/'+cid+'/students',t1,method='POST',body={'studentIds':[sid]},expected=409)
    call('/admin/classes/'+source['id']+'/students/'+sid,t1,method='DELETE')
    assert sid in {r['id'] for r in call('/admin/classes/'+cid+'/candidates?keyword=20240020',t1)}
    call('/admin/classes/'+cid+'/students',t1,method='POST',body={'studentIds':[sid,'999999999']},expected=400)
    assert call('/admin/classes/'+cid+'/students',t1)==[],'Invalid batch must roll back entirely'
    call('/admin/classes/'+cid+'/students',t1,method='POST',body={'studentIds':[sid,sid]})
    call('/admin/classes/'+cid+'/students',t1,method='POST',body={'studentIds':[sid]})
    assert len(call('/admin/classes/'+cid+'/students',t1))==1
    assert call('/admin/classes/'+cid+'/candidates?keyword=20240020',t1)==[]
    assert len(call('/admin/classes/'+cid+'/students?keyword=20240020',t1))==1
    assert call('/admin/classes/'+cid+'/students?keyword=not-a-student',t1)==[]
    assert '1' in course_ids(student),'Removing from a class must not withdraw from the course'
    call('/admin/classes/'+cid,t1,method='DELETE');active=False
    call('/admin/classes/'+cid,t1,expected=404)
    assert all(row['id']!=cid for row in call('/admin/classes',t1))
finally:
    if active:call('/admin/classes/'+cid,t1,method='DELETE')
    call('/admin/classes/'+source['id']+'/students',t1,method='POST',body={'studentIds':[sid]})
assert {r['id'] for r in call('/admin/classes/'+source['id']+'/students',t1)}==original_members
print('PASS: class ownership, create/edit/archive, roster search, add/remove, duplicate membership and transaction rollback. Original class roster restored.')
