package cn.edu.learning.mapper;
import org.apache.ibatis.annotations.Param;
import java.util.*;
public interface AttendanceMapper {
 void create(Map<String,Object> row);
 void recipients(@Param("sessionId") long sessionId,@Param("courseId") long courseId);
 Map<String,Object> lock(long id);
 List<Map<String,Object>> teacherList(long courseId);
 List<Map<String,Object>> studentList(long studentId);
 List<Map<String,Object>> roster(long id);
 int recipient(@Param("id") long id,@Param("studentId") long studentId);
 void sign(@Param("id") long id,@Param("studentId") long studentId);
 void close(long id);
}
