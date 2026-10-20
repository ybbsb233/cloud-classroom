"""Attendance lifecycle smoke test. Uses demo student 20240020 and restores enrollment/class membership.
With MYSQL_PWD configured, deletes only sessions created by this test; otherwise leaves them closed.
"""
import os,re,subprocess
from verify_enrollment import call,login

teachers=[login('teacher01'),login('teacher02')]
t1,t2=teachers
s1,s2=login('20240001'),login('20240020')
created=[]
classes=[]
sid=call('/auth/me',s2)['id']
for room in call('/admin/classes?courseId=1',t1):
    if sid in {r['id'] for r in call('/admin/classes/'+room['id']+'/students',t1)}:classes.append(room['id'])
def publish(mode):
    result=call('/admin/courses/1/attendance',t1,method='POST',body={'title':'[自动验证] '+mode,'mode':mode,'minutes':10})
    created.append(result['id']);return result['id']
def signed(id,token,body={}):return call('/student/attendance/'+id+'/sign',token,method='POST',body=body)
def database(sql):
    result=subprocess.run(['mysql','--host=127.0.0.1','--user=root','--default-character-set=utf8mb4','--batch'],input='USE classroom_learning;'+sql,encoding='utf-8',capture_output=True)
    assert result.returncode==0,result.stderr
try:
    call('/student/attendance',expected=401)
    call('/admin/courses/1/attendance',s1,expected=403)
    call('/admin/courses/3/attendance',t1,method='POST',body={'title':'invalid','mode':'NORMAL','minutes':10},expected=404)
    call('/admin/courses/1/attendance',t1,method='POST',body={'title':'invalid','mode':'UNKNOWN','minutes':10},expected=400)
    normal,code=publish('NORMAL'),publish('CODE')
    teacher_rows=call('/admin/courses/1/attendance',t1)
    code_row=next(r for r in teacher_rows if r['id']==code)
    assert re.fullmatch(r'[0-9]{4}',code_row['passcode'])
    assert code_row['expectedCount']==20
    call('/admin/attendance/'+code+'/students',t2,expected=404)
    for token in (s1,s2):
        rows=call('/student/attendance',token)
        assert set(created).issubset({r['id'] for r in rows})
        assert all('passcode' not in row for row in rows),'Passcode leaked to student'
    signed(normal,s1)
    stamp=next(r for r in call('/student/attendance',s1) if r['id']==normal)['signedAt']
    signed(normal,s1)
    assert next(r for r in call('/student/attendance',s1) if r['id']==normal)['signedAt']==stamp
    bad='0000' if code_row['passcode']!='0000' else '1111'
    call('/student/attendance/'+code+'/sign',s2,method='POST',body={'passcode':bad},expected=400)
    call('/student/attendance/'+code+'/sign',s2,method='POST',body={'passcode':'123'},expected=400)
    assert not next(r for r in call('/student/attendance',s2) if r['id']==code)['signedAt']
    signed(code,s2,{'passcode':code_row['passcode']})
    assert sum(bool(r['signedAt']) for r in call('/admin/attendance/'+code+'/students',t1))==1
    call('/student/courses/1',s2,method='DELETE')
    assert not set(created)&{r['id'] for r in call('/student/attendance',s2)}
    call('/student/attendance/'+normal+'/sign',s2,method='POST',body={},expected=404)
    call('/student/courses/1/join',s2,method='POST')
    # A student who joins after publication is not retroactively added to the fixed recipient list.
    call('/student/courses/1',s2,method='DELETE')
    later=publish('NORMAL')
    call('/student/courses/1/join',s2,method='POST')
    assert later not in {r['id'] for r in call('/student/attendance',s2)}
    call('/student/attendance/'+later+'/sign',s2,method='POST',body={},expected=403)
    call('/admin/attendance/'+code+'/close',t1,method='POST',body={})
    call('/student/attendance/'+code+'/sign',s1,method='POST',body={'passcode':code_row['passcode']},expected=400)
    if os.environ.get('MYSQL_PWD'):
        database('UPDATE attendance_session SET created_at=NOW()-INTERVAL 2 MINUTE,expires_at=NOW()-INTERVAL 1 MINUTE WHERE id='+normal+" AND title='[自动验证] NORMAL';")
        call('/student/attendance/'+normal+'/sign',s2,method='POST',body={},expected=400)
        assert not next(r for r in call('/student/attendance',s2) if r['id']==normal)['active']
    print('PASS: normal/code signing, wrong/malformed code, no code leakage, duplicate protection, teacher/enrollment permissions, fixed recipients, close and expiry.')
finally:
    call('/student/courses/1/join',s2,method='POST')
    for class_id in classes:call('/admin/classes/'+class_id+'/students',t1,method='POST',body={'studentIds':[sid]})
    for id in created:call('/admin/attendance/'+id+'/close',t1,method='POST',body={})
    if created and os.environ.get('MYSQL_PWD'):
        ids=','.join(str(int(id)) for id in created)
        database('START TRANSACTION;DELETE r FROM attendance_recipient r JOIN attendance_session s ON s.id=r.session_id WHERE s.id IN ('+ids+") AND s.title LIKE '[自动验证] %';DELETE FROM attendance_session WHERE id IN ("+ids+") AND title LIKE '[自动验证] %';COMMIT;")
