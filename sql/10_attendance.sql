USE classroom_learning;
CREATE TABLE IF NOT EXISTS attendance_session (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 course_id BIGINT NOT NULL,
 teacher_id BIGINT NOT NULL,
 title VARCHAR(80) NOT NULL,
 mode VARCHAR(12) NOT NULL,
 passcode CHAR(4) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 expires_at DATETIME(3) NOT NULL,
 closed_at DATETIME(3) NULL,
 KEY ix_attendance_course(course_id,id),
 FOREIGN KEY(course_id) REFERENCES course(id),
 FOREIGN KEY(teacher_id) REFERENCES app_user(id),
 CHECK(mode IN ('NORMAL','CODE')),
 CHECK((mode='NORMAL' AND passcode IS NULL) OR (mode='CODE' AND passcode REGEXP '^[0-9]{4}$')),
 CHECK(expires_at>created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS attendance_recipient (
 session_id BIGINT NOT NULL,
 student_id BIGINT NOT NULL,
 signed_at DATETIME(3) NULL,
 PRIMARY KEY(session_id,student_id),
 KEY ix_attendance_student(student_id,session_id),
 FOREIGN KEY(session_id) REFERENCES attendance_session(id),
 FOREIGN KEY(student_id) REFERENCES app_user(id)
) ENGINE=InnoDB;
