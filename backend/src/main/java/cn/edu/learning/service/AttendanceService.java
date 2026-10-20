package cn.edu.learning.service;
import cn.edu.learning.mapper.*;
import cn.edu.learning.pojo.Models.User;
import cn.edu.learning.exception.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.constraints.*;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AttendanceService {
 public record Publish(@NotBlank @Size(max=80) String title,@NotBlank @Pattern(regexp="NORMAL|CODE") String mode,@Min(1) @Max(120) int minutes) {}
 public record Sign(@Pattern(regexp="[0-9]{4}") String passcode) {}
 private final AttendanceMapper mapper;
 private final CourseMapper courses;
 private final SecureRandom random=new SecureRandom();
 public AttendanceService(AttendanceMapper mapper,CourseMapper courses){this.mapper=mapper;this.courses=courses;}
 private void course(long id){if(courses.courseExists(id)==0)throw new ApiException(404,"课程不存在或无权访问");}
 private Map<String,Object> session(long id){var row=mapper.lock(id);if(row==null)throw new ApiException(404,"签到不存在");course(((Number)row.get("courseId")).longValue());return row;}
 private void teacher(User user,Map<String,Object> row){if(!"TEACHER".equals(user.role())||((Number)row.get("teacherId")).longValue()!=user.id())throw new ApiException(403,"只能管理自己发布的签到");}
 public Object teacherList(long courseId){course(courseId);return mapper.teacherList(courseId);}
 public Object studentList(User user){return mapper.studentList(user.id());}
 @Transactional public Object publish(User user,long courseId,Publish input){
  if(!"TEACHER".equals(user.role()))throw new ApiException(403,"需要教师权限");course(courseId);
  var row=new HashMap<String,Object>();row.put("courseId",courseId);row.put("teacherId",user.id());row.put("title",input.title().trim());
  if(input.title().isBlank())throw new ApiException(400,"请填写签到标题");
  row.put("mode",input.mode());row.put("passcode","CODE".equals(input.mode())?String.format(Locale.ROOT,"%04d",random.nextInt(10000)):null);
  row.put("expiresAt",LocalDateTime.now().plusMinutes(input.minutes()));mapper.create(row);
  long id=((Number)row.get("id")).longValue();mapper.recipients(id,courseId);return Map.of("id",Long.toString(id));
 }
 @Transactional public Object roster(User user,long id){var row=session(id);teacher(user,row);return mapper.roster(id);}
 @Transactional public void close(User user,long id){var row=session(id);teacher(user,row);mapper.close(id);}
 @Transactional public void sign(User user,long id,Sign input){
  if(!"STUDENT".equals(user.role()))throw new ApiException(403,"需要学生身份");
  var row=session(id);if(mapper.recipient(id,user.id())==0)throw new ApiException(403,"你不在本次签到名单中");
  if(!Boolean.TRUE.equals(row.get("active"))&&(!(row.get("active") instanceof Number)||((Number)row.get("active")).intValue()!=1))throw new ApiException(400,"签到已结束");
  if("CODE".equals(row.get("mode"))&&!Objects.equals(row.get("passcode"),input.passcode()))throw new ApiException(400,"口令不正确，请输入教师展示的四位数字");
  mapper.sign(id,user.id());
 }
}
