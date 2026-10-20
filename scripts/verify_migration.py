"""Read-only API smoke test for the independently migrated project."""
import json
import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = os.environ.get('TEST_BASE_URL', 'http://127.0.0.1:18091') + '/api'
checks = 0

def call(path, token=None, body=None, expected=200):
    global checks
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = Request(BASE + path, headers=headers,
                      data=json.dumps(body).encode() if body is not None else None)
    try:
        with urlopen(request, timeout=10) as response:
            status, result = response.status, json.load(response)
    except HTTPError as error:
        status, result = error.code, json.load(error)
    assert status == expected, (path, status, result.get('msg'))
    checks += 1
    if status == 200:
        assert result['code'] == 1, path
        return result['data']

def login(username, password):
    return call('/auth/login', body={'username': username, 'password': password})['token']

call('/courses', expected=401)
admin = login('teacher01', os.environ.get('TEST_ADMIN_PASSWORD', '123456'))
student = login('20240001', os.environ.get('TEST_STUDENT_PASSWORD', '123456'))
other = login('20240002', os.environ.get('TEST_STUDENT_PASSWORD', '123456'))
assert call('/auth/me', admin)['role'] == 'TEACHER'
assert call('/auth/me', student)['role'] == 'STUDENT'
courses = call('/courses', student)
assert len(courses) == 5
for course in courses:
    cid = str(course['id'])
    assert len(call('/courses/' + cid + '/chapters', student)) == 5
    call('/courses/' + cid + '/knowledge-points', student)
    assert len(call('/student/practices/chapter-sets?courseId=' + cid, student)) == 5
    call('/student/knowledge-analysis?courseId=' + cid, student)
    call('/student/trend?courseId=' + cid, student)
    if cid in {'1','2'}:
        call('/admin/knowledge-analysis?courseId=' + cid, admin)
        call('/admin/course-students?courseId=' + cid, admin)
call('/student/summary', student)
call('/student/wrong-questions?courseId=1', student)
history = call('/student/practices?page=1&pageSize=10', student)
assert history['total'] >= 25
rows = history.get('records', history.get('items', history.get('rows', [])))
if rows:
    pid = str(rows[0].get('id', rows[0].get('practiceId')))
    call('/student/practices/' + pid + '/result', student)
    call('/admin/practices/' + pid + '/result', admin, expected=200 if rows[0]['courseId'] in {'1','2'} else 403)
    # Other students see 404 so the endpoint does not reveal record existence.
    call('/student/practices/' + pid + '/result', other, expected=404)
else:
    raise AssertionError('History response has no recognized record list')
call('/admin/summary', admin)
call('/admin/students?page=1&pageSize=10', admin)
call('/admin/practices?page=1&pageSize=10', admin)
call('/admin/summary', student, expected=403)
call('/admin/students', student, expected=403)
call('/student/summary', admin, expected=403)
print(f'PASS: {checks} login, catalog, history, analysis and authorization API checks. No learning data changed.')
