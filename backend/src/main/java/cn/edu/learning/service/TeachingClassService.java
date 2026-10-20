package cn.edu.learning.service;

import cn.edu.learning.exception.ApiException;
import cn.edu.learning.mapper.*;
import cn.edu.learning.pojo.Models.User;
import cn.edu.learning.utils.Ids;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class TeachingClassService {
 public record ClassInput(@NotBlank String courseId,@NotBlank @Size(max=80) String name,@NotBlank @Size(max=80) String semester,@Size(max=100) String location,@Size(max=500) String notes) {}
 public record ClassUpdate(@NotBlank @Size(max=80) String name,@NotBlank @Size(max=80) String semester,@Size(max=100) String location,@Size(max=500) String notes) {}
 public record Members(@NotEmpty @Size(max=200) List<@NotBlank String> studentIds) {}
 private final TeachingClassMapper mapper;
 private final EnrollmentMapper enrollments;
 private final UserMapper users;
 public TeachingClassService(TeachingClassMapper mapper,EnrollmentMapper enrollments,UserMapper users){this.mapper=mapper;this.enrollments=enrollments;this.users=users;}
 private void course(User teacher,long courseId){var c=enrollments.lockCourse(courseId);if(c==null||!teacher.id().equals(((Number)c.get("teacherId")).longValue()))throw new ApiException(404,"任教课程不存在");}
 private Map<String,Object> owned(User teacher,long id,boolean lock){
  var row=mapper.find(id,teacher.id());if(row==null)throw new ApiException(404,"任教班级不存在");
  if(lock){course(teacher,Ids.parse(row.get("courseId").toString()));if(mapper.lock(id,teacher.id())==null)throw new ApiException(404,"任教班级不存在");}
  return row;
 }
 private String text(String value){return value==null?"":value.trim();}
 public Object list(User teacher,Long courseId){return mapper.list(teacher.id(),courseId);}
 public Object detail(User teacher,long id){return owned(teacher,id,false);}
 @Transactional public Object create(User teacher,ClassInput input){
  long cid=Ids.parse(input.courseId());course(teacher,cid);
  Map<String,Object> row=new HashMap<>();row.put("courseId",cid);row.put("name",text(input.name()));row.put("semester",text(input.semester()));row.put("location",text(input.location()));row.put("notes",text(input.notes()));mapper.insert(row);
  return mapper.find(((Number)row.get("id")).longValue(),teacher.id());
 }
 @Transactional public Object update(User teacher,long id,ClassUpdate input){owned(teacher,id,true);mapper.update(id,text(input.name()),text(input.semester()),text(input.location()),text(input.notes()));return mapper.find(id,teacher.id());}
 @Transactional public void archive(User teacher,long id){owned(teacher,id,true);mapper.clearMembers(id);mapper.archive(id);}
 public Object students(User teacher,long id,String keyword){owned(teacher,id,false);return mapper.students(id,keyword);}
 public Object candidates(User teacher,long id,String keyword){var row=owned(teacher,id,false);return mapper.candidates(Ids.parse(row.get("courseId").toString()),keyword);}
 @Transactional public void add(User teacher,long id,Members input){
  var row=owned(teacher,id,true);long cid=Ids.parse(row.get("courseId").toString());
  for(String raw:new LinkedHashSet<>(input.studentIds())){
   long sid=Ids.parse(raw);User student=users.byId(sid);
   if(student==null||!student.role().equals("STUDENT")||student.enabled()!=1||enrollments.enrolled(sid,cid)==null)throw new ApiException(400,"只能添加已加入该课程的启用学生");
   Long other=mapper.memberClass(sid,cid);if(other!=null&&other!=id)throw new ApiException(409,"学生已在该课程其他班级，请先从原班级移出");
   if(other==null)mapper.add(id,cid,sid);
  }
 }
 @Transactional public void remove(User teacher,long id,long sid){owned(teacher,id,true);mapper.remove(id,sid);}
}
