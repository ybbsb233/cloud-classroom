"""Read-only integration checks for weekly schedules and identity scoping."""
from collections import Counter
import os
from verify_enrollment import call, login, course_ids

call('/schedule',expected=401)
t1,t2=login('teacher01'),login('teacher02')
student=login('20240020',os.environ.get('TEST_STUDENT_PASSWORD','123456'))
all_rows=[]
for token in (t1,t2,student):
    rows=call('/schedule',token)
    visible=course_ids(token)
    assert set(row['courseId'] for row in rows)==visible
    assert Counter(row['courseId'] for row in rows)==Counter({cid:2 for cid in visible})
    assert all(1<=row['weekday']<=5 and 1<=row['period']<=4 for row in rows)
    assert len({(row['weekday'],row['period']) for row in rows})==len(rows)
    for cid in visible:
        assert len({row['weekday'] for row in rows if row['courseId']==cid})==2
    assert call('/schedule?studentId=1&teacherId=1',token)==rows,'Client parameters must not override current identity'
    if token in (t1,t2):all_rows.extend(rows)
assert len(all_rows)==10
assert len({(row['weekday'],row['period']) for row in all_rows})==10,'Courses conflict globally'
print('PASS: 5 courses, 10 weekly sessions, weekdays only, no global conflicts, two distinct days per course; teacher/student scope verified.')
