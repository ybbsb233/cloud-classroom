"""Exercise teacher boundaries and enrollment lifecycle; restore the test student's courses."""
import json
import os
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE=os.environ.get('TEST_BASE_URL','http://127.0.0.1:18091')+'/api'
PASSWORD=os.environ.get('TEST_TEACHER_PASSWORD','123456')
checks=0

def call(path,token=None,method='GET',body=None,expected=200):
    global checks
    headers={'Content-Type':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    req=Request(BASE+path,headers=headers,method=method,data=None if body is None else json.dumps(body).encode())
    try:
        with urlopen(req,timeout=15) as response: status,result=response.status,json.load(response)
    except HTTPError as error: status,result=error.code,json.load(error)
    assert status==expected,(path,status,result.get('msg'))
    checks+=1
    if status==200:
        assert result['code']==1,result
        return result['data']

def login(name,password=PASSWORD):return call('/auth/login',method='POST',body={'username':name,'password':password})['token']
def course_ids(token):return {r['id'] for r in call('/courses',token)}

if __name__ == '__main__':
    t1,t2=login('teacher01'),login('teacher02')
    student=login('20240020',os.environ.get('TEST_STUDENT_PASSWORD','123456'))
    call('/auth/login',method='POST',body={'username':'admin','password':PASSWORD},expected=401)
    assert call('/auth/me',t1)['role']=='TEACHER'
    assert course_ids(t1)=={'1','2'}
    assert course_ids(t2)=={'3','4','5'}
    assert course_ids(student)=={'1','2','3','4','5'}
    for teacher,ids in [(t1,{'1','2'}),(t2,{'3','4','5'})]:
        assert {r['courseId'] for r in call('/admin/summary',teacher)['courses']}==ids
        history=call('/admin/practices?pageSize=50',teacher)
        assert all(r['courseId'] in ids for r in history['rows'])
        assert history['total']==(200 if teacher==t1 else 300)
        assert call('/admin/students',teacher)['total']==20
        for cid in ids:
            roster=call('/admin/course-students?courseId='+cid,teacher)
            assert roster['total']==20
    call('/courses/3/chapters',t1,expected=404)
    call('/admin/knowledge-analysis?courseId=3',t1,expected=404)
    call('/admin/knowledge-analysis?courseId=1',t2,expected=404)
    other_practice=call('/admin/practices?courseId=3',t2)['rows'][0]['practiceId']
    call('/admin/practices/'+other_practice+'/result',t1,expected=403)
    call('/admin/summary',student,expected=403)
    call('/student/courses/catalog',t1,expected=403)
    call('/student/courses/999999/join',student,method='POST',expected=404)
    assert len(call('/student/courses/catalog?keyword=',student))==5
    assert [r['id'] for r in call('/student/courses/catalog?keyword=%E6%95%B0%E6%8D%AE%E5%BA%93',student)]==['2']
    assert len(call('/student/courses/catalog?keyword=%E6%95%99%E5%B8%88%E4%BA%8C',student))==3
    assert call('/student/courses/catalog?keyword=not-a-course',student)==[]
    before=call('/student/practices',student)['total']
    math_practice=call('/student/practices?courseId=1',student)['rows'][0]['practiceId']
    original=course_ids(student)
    # Course withdrawal cascades class membership, so remember and restore the test roster too.
    sid=call('/auth/me',student)['id']
    original_classes=[]
    for teacher in (t1,t2):
        for classroom in call('/admin/classes',teacher):
            if sid in {row['id'] for row in call('/admin/classes/'+classroom['id']+'/students',teacher)}:
                original_classes.append((teacher,classroom['id']))
    try:
        call('/student/courses/1',student,method='DELETE')
        call('/student/courses/1',student,method='DELETE')
        assert course_ids(student)=={'2','3','4','5'}
        assert len(call('/student/summary',student))==4
        assert call('/admin/course-students?courseId=1',t1)['total']==19
        assert not next(r for r in call('/student/courses/catalog',student) if r['id']=='1')['enrolled']
        call('/courses/1/chapters',student,expected=404)
        call('/student/practices/chapter-sets?courseId=1',student,expected=404)
        call('/student/practices',student,method='POST',body={'courseId':'1','count':5},expected=404)
        call('/student/practices/chapters/101',student,method='POST',expected=404)
        call('/student/knowledge-analysis?courseId=1',student,expected=404)
        call('/student/practices/'+math_practice+'/result',student,expected=403)
        call('/student/practices/'+math_practice+'/submit',student,method='POST',body={'answers':[]},expected=403)
        assert call('/student/practices?courseId=1',student)['total']==0
        for cid in ['2','3','4','5']:call('/student/courses/'+cid,student,method='DELETE')
        assert call('/courses',student)==[]
        assert call('/student/summary',student)==[]
        assert call('/student/wrong-questions',student)['total']==0
        with ThreadPoolExecutor(max_workers=3) as pool:
            list(pool.map(lambda _:call('/student/courses/1/join',student,method='POST'),range(3)))
        assert course_ids(student)=={'1'}
        assert call('/admin/course-students?courseId=1',t1)['total']==20
    finally:
        for cid in original:call('/student/courses/'+cid+'/join',student,method='POST')
        for teacher,class_id in original_classes:call('/admin/classes/'+class_id+'/students',teacher,method='POST',body={'studentIds':[sid]})
    assert course_ids(student)==original
    assert call('/student/practices',student)['total']==before
    with ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(lambda pair:course_ids(pair[0])==pair[1],[(t1,{'1','2'}),(t2,{'3','4','5'}),(student,original)]*4))
    assert all(results),'Request scope leaked between identities'
    print(f'PASS: {checks} HTTP checks; teacher boundaries, search, leave/rejoin, empty enrollment and concurrent joins. Test student restored to all five courses; no practice created.')
