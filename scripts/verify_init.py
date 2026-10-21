"""Verify current initialization in two disposable databases; never modify the live database.

Uses mysql from PATH and MYSQL_PWD for authentication. Override DB_HOST, DB_PORT,
DB_USERNAME as needed. Test schemas have random names and are removed on exit.
"""
import os
from pathlib import Path
import re
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]
MYSQL = os.environ.get('MYSQL_PATH', 'mysql')
ARGS = [MYSQL, '--host=' + os.environ.get('DB_HOST', '127.0.0.1'),
        '--port=' + os.environ.get('DB_PORT', '3306'),
        '--user=' + os.environ.get('DB_USERNAME', 'root'),
        '--default-character-set=utf8mb4', '--batch', '--skip-column-names', '--skip-reconnect']


def run(sql, success=True):
    result = subprocess.run(ARGS, input=sql.encode('utf-8'), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if success and result.returncode:
        raise AssertionError(result.stderr.decode('utf-8', errors='replace'))
    if not success:
        assert result.returncode != 0, 'Expected the invalid operation to fail'
    return result.stdout.decode('utf-8').strip()


def main():
    init = (ROOT / 'sql/init.sql').read_text(encoding='utf-8')
    history = (ROOT / 'sql/demo_history.sql').read_text(encoding='utf-8')
    assert len(re.findall(r'^CREATE TABLE ', init, re.M)) == 14
    assert not re.search(r'^\s*(DROP|ALTER)\s|FOREIGN_KEY_CHECKS', init, re.M | re.I)
    assert not re.search(r'^\s*(CREATE|DROP|ALTER)\s', history, re.M | re.I)
    names = ['classroom_init_test_' + uuid.uuid4().hex for _ in range(2)]
    created = []
    checks = 0
    try:
        for with_history, name in enumerate(names):
            sql = init.replace('classroom_learning', name)
            # Reserve our random name before recording it for cleanup. A collision
            # must never cause an existing database to be removed.
            run(f'CREATE DATABASE `{name}`;')
            created.append(name)
            run(sql.replace(f'CREATE DATABASE {name} ', f'ALTER DATABASE {name} ', 1))

            def expect(query, expected):
                nonlocal checks
                actual = run(f'USE `{name}`;\n' + query)
                assert actual == str(expected), (query, actual, expected)
                checks += 1

            expect('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE();', 14)
            expect("SELECT COUNT(*) FROM app_user WHERE role='TEACHER';", 2)
            expect("SELECT COUNT(*) FROM app_user WHERE role='ADMIN';", 0)
            expect('SELECT COUNT(*) FROM course;', 5)
            expect('SELECT COUNT(*) FROM chapter WHERE is_current=1;', 25)
            expect('SELECT COUNT(*) FROM question q JOIN chapter c ON c.id=q.chapter_id WHERE c.is_current=1;', 500)
            expect('SELECT COUNT(*) FROM teaching_class WHERE archived=0;', 5)
            expect('SELECT COUNT(*) FROM course_schedule;', 10)
            expect('SELECT COUNT(*) FROM (SELECT course_id FROM course_schedule GROUP BY course_id HAVING COUNT(*)<>2) t;', 0)
            expect("SELECT COUNT(*) FROM course c JOIN app_user u ON u.id=c.teacher_id WHERE u.role<>'TEACHER';", 0)
            expect('SELECT COUNT(*) FROM question_knowledge qk JOIN question q ON q.id=qk.question_id JOIN knowledge_point k ON k.id=qk.knowledge_id WHERE q.chapter_id<>k.chapter_id;', 0)
            expect("SELECT COUNT(*) FROM app_user WHERE role='STUDENT';", 0)
            if with_history:
                data = history.replace('classroom_learning', name)
                run(data)
                expect("SELECT COUNT(*) FROM app_user WHERE role='STUDENT';", 20)
                expect('SELECT COUNT(*) FROM course_enrollment;', 100)
                expect('SELECT COUNT(*) FROM class_member;', 100)
                expect("SELECT COUNT(*) FROM practice WHERE archived=0 AND status='SUBMITTED';", 500)
                expect("SELECT COUNT(*) FROM practice_item i JOIN practice p ON p.id=i.practice_id WHERE p.archived=0 AND p.status='SUBMITTED';", 10000)
                expect('SELECT COUNT(*) FROM practice p WHERE p.question_count<>(SELECT COUNT(*) FROM practice_item i WHERE i.practice_id=p.id);', 0)
                expect("SELECT COUNT(*) FROM practice p WHERE p.status='SUBMITTED' AND p.correct_count<>(SELECT SUM(is_correct) FROM practice_item i WHERE i.practice_id=p.id);", 0)
                run(data, success=False)
                expect("SELECT COUNT(*) FROM app_user WHERE role='STUDENT';", 20)
            for invalid in [
                "INSERT INTO app_user(username,real_name,password_hash,role) VALUES('invalid','test','test','ADMIN');",
                "INSERT INTO course_schedule(course_id,weekday,period,location) VALUES(1,6,1,'test');",
                "INSERT INTO class_member(class_id,course_id,student_id) VALUES(1,1,999999999);",
                "INSERT INTO attendance_session(course_id,teacher_id,title,mode,passcode,expires_at) VALUES(1,1,'test','CODE','12',NOW()+INTERVAL 5 MINUTE);",
            ]:
                run(f'USE `{name}`; START TRANSACTION; {invalid} ROLLBACK;', success=False)
                checks += 1
            run(sql, success=False)
            expect('SELECT COUNT(*) FROM course;', 5)
        print(f'PASS: {checks} unified initialization, history, repeat-import and constraint checks; temporary schemas removed.')
    finally:
        for name in created:
            assert re.fullmatch(r'classroom_init_test_[0-9a-f]{32}', name)
            run(f'DROP DATABASE `{name}`;')


if __name__ == '__main__':
    main()
