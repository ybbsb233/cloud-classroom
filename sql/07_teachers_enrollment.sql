-- Apply ONCE after the original 01..06 schema or 00 full snapshot. Back up first.
USE classroom_learning;
ALTER TABLE app_user
    DROP CHECK app_user_chk_1;
ALTER TABLE app_user
    ADD CONSTRAINT chk_user_role_transition CHECK (role IN ('STUDENT', 'ADMIN', 'TEACHER'));
UPDATE app_user
SET username='teacher01',
    real_name='教师一',
    role='TEACHER',
    token_version=token_version + 1
WHERE username = 'admin'
  AND role = 'ADMIN';
INSERT INTO app_user(username, real_name, password_hash, role)
VALUES ('teacher01', '教师一', '$2a$10$m90gjhSLyMLoep/NdzA2/OQJkZz.3O6g4jgRuW4Yup.wWp41NN8xi', 'TEACHER'),
       ('teacher02', '教师二', '$2a$10$m90gjhSLyMLoep/NdzA2/OQJkZz.3O6g4jgRuW4Yup.wWp41NN8xi', 'TEACHER')
ON DUPLICATE KEY UPDATE username=VALUES(username);
ALTER TABLE app_user
    DROP CHECK chk_user_role_transition;
ALTER TABLE app_user
    ADD CONSTRAINT chk_user_role CHECK (role IN ('STUDENT', 'TEACHER'));
ALTER TABLE course
    ADD COLUMN teacher_id BIGINT  NULL,
    ADD COLUMN is_open    TINYINT NOT NULL DEFAULT 1,
    ADD CONSTRAINT chk_course_open CHECK (is_open IN (0, 1)),
    ADD CONSTRAINT fk_course_teacher FOREIGN KEY (teacher_id) REFERENCES app_user (id);
UPDATE course
SET teacher_id=(SELECT id
                FROM app_user
                WHERE username = CASE WHEN course.id IN (1, 2) THEN 'teacher01' ELSE 'teacher02' END);
ALTER TABLE course
    MODIFY teacher_id BIGINT NOT NULL;
CREATE TABLE course_enrollment
(
    student_id BIGINT      NOT NULL,
    course_id  BIGINT      NOT NULL,
    joined_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (student_id, course_id),
    INDEX idx_enrollment_course (course_id, student_id),
    CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) REFERENCES app_user (id),
    CONSTRAINT fk_enrollment_course FOREIGN KEY (course_id) REFERENCES course (id)
) ENGINE = InnoDB;
INSERT INTO course_enrollment(student_id, course_id)
SELECT u.id, c.id
FROM app_user u
         CROSS JOIN course c
WHERE u.role = 'STUDENT';
