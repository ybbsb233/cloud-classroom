package cn.edu.learning.mapper;

import org.apache.ibatis.annotations.Param;

import java.util.*;

public interface EnrollmentMapper {
    List<Map<String, Object>> catalog(@Param("studentId") long studentId, @Param("keyword") String keyword);

    Map<String, Object> lockCourse(long id);

    Long enrolled(@Param("studentId") long studentId, @Param("courseId") long courseId);

    int join(@Param("studentId") long studentId, @Param("courseId") long courseId);

    int leave(@Param("studentId") long studentId, @Param("courseId") long courseId);

    long courseStudents(long courseId);
}
