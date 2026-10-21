-- One-time migration after 07_teachers_enrollment.sql. Does not alter practice history.
USE classroom_learning;
CREATE TABLE teaching_class
(
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT       NOT NULL,
    name        VARCHAR(80)  NOT NULL,
    semester    VARCHAR(80)  NOT NULL,
    location    VARCHAR(100) NOT NULL DEFAULT '',
    notes       VARCHAR(500) NOT NULL DEFAULT '',
    archived    TINYINT      NOT NULL DEFAULT 0,
    active_name VARCHAR(80) GENERATED ALWAYS AS (CASE WHEN archived = 0 THEN name ELSE NULL END) STORED,
    created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_class_course_id (id, course_id),
    UNIQUE KEY uk_class_name (course_id, active_name),
    CONSTRAINT fk_class_course FOREIGN KEY (course_id) REFERENCES course (id),
    CONSTRAINT chk_class_name CHECK (CHAR_LENGTH(TRIM(name)) > 0),
    CONSTRAINT chk_class_semester CHECK (CHAR_LENGTH(TRIM(semester)) > 0),
    CONSTRAINT chk_class_archived CHECK (archived IN (0, 1))
) ENGINE = InnoDB;
CREATE TABLE class_member
(
    class_id   BIGINT      NOT NULL,
    course_id  BIGINT      NOT NULL,
    student_id BIGINT      NOT NULL,
    joined_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (class_id, student_id),
    UNIQUE KEY uk_member_course (student_id, course_id),
    CONSTRAINT fk_member_class FOREIGN KEY (class_id, course_id) REFERENCES teaching_class (id, course_id),
    CONSTRAINT fk_member_enrollment FOREIGN KEY (student_id, course_id) REFERENCES course_enrollment (student_id, course_id) ON DELETE CASCADE
) ENGINE = InnoDB;
INSERT INTO teaching_class(course_id, name, semester, notes)
SELECT id, '2024级教学一班', '2026-2027学年第一学期', '根据现有选课关系初始化，可由任课教师调整。'
FROM course;
INSERT INTO class_member(class_id, course_id, student_id)
SELECT tc.id, tc.course_id, e.student_id
FROM teaching_class tc
         JOIN course_enrollment e ON e.course_id = tc.course_id;
