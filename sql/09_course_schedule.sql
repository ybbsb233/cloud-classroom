-- Repeatable migration: preserve existing schedules and learning records.
USE classroom_learning;
CREATE TABLE IF NOT EXISTS course_schedule
(
    id        BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    course_id BIGINT       NOT NULL,
    weekday   TINYINT      NOT NULL,
    period TINYINT NOT NULL,
    location  VARCHAR(100) NOT NULL,
    UNIQUE KEY uk_schedule_slot (weekday, period),
    UNIQUE KEY uk_schedule_course_day (course_id, weekday),
    CONSTRAINT fk_schedule_course FOREIGN KEY (course_id) REFERENCES course (id),
    CONSTRAINT chk_schedule_weekday CHECK (weekday BETWEEN 1 AND 5),
    CONSTRAINT chk_schedule_period CHECK (period BETWEEN 1 AND 4)
) ENGINE = InnoDB;
-- Fixed varied weekly plan: two different weekdays and periods per demo course.
INSERT INTO course_schedule(course_id, weekday, period, location)
SELECT ranked.id, planned.weekday, planned.period, CONCAT('教三楼 ', 300 + ranked.ordinal)
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order,id) ordinal FROM course) ranked
         JOIN (SELECT 1 ordinal, 1 weekday, 3 period
               UNION ALL
               SELECT 1 ordinal, 3 weekday, 1 period
               UNION ALL
               SELECT 2 ordinal, 4 weekday, 4 period
               UNION ALL
               SELECT 2 ordinal, 5 weekday, 2 period
               UNION ALL
               SELECT 3 ordinal, 1 weekday, 4 period
               UNION ALL
               SELECT 3 ordinal, 3 weekday, 3 period
               UNION ALL
               SELECT 4 ordinal, 1 weekday, 2 period
               UNION ALL
               SELECT 4 ordinal, 2 weekday, 3 period
               UNION ALL
               SELECT 5 ordinal, 5 weekday, 3 period
               UNION ALL
               SELECT 5 ordinal, 4 weekday, 1 period) planned ON planned.ordinal = ranked.ordinal
WHERE NOT EXISTS(SELECT 1 FROM course_schedule existing WHERE existing.course_id = ranked.id);
