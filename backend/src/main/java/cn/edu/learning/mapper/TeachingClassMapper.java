package cn.edu.learning.mapper;

import org.apache.ibatis.annotations.Param;

import java.util.*;

public interface TeachingClassMapper {
    List<Map<String, Object>> list(@Param("teacherId") long teacherId, @Param("courseId") Long courseId);

    Map<String, Object> find(@Param("id") long id, @Param("teacherId") long teacherId);

    Map<String, Object> lock(@Param("id") long id, @Param("teacherId") long teacherId);

    void insert(Map<String, Object> row);

    void update(@Param("id") long id, @Param("name") String name, @Param("semester") String semester, @Param("location") String location, @Param("notes") String notes);

    void archive(long id);

    void clearMembers(long id);

    List<Map<String, Object>> students(@Param("id") long id, @Param("keyword") String keyword);

    List<Map<String, Object>> candidates(@Param("courseId") long courseId, @Param("keyword") String keyword);

    Long memberClass(@Param("studentId") long studentId, @Param("courseId") long courseId);

    void add(@Param("id") long id, @Param("courseId") long courseId, @Param("studentId") long studentId);

    void remove(@Param("id") long id, @Param("studentId") long studentId);
}
