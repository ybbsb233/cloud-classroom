package cn.edu.learning.controller;
import cn.edu.learning.pojo.Models.*;
import cn.edu.learning.service.AttendanceService;
import cn.edu.learning.service.AttendanceService.*;
import cn.edu.learning.utils.Ids;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
public class AttendanceController {
 private final AttendanceService service;
 public AttendanceController(AttendanceService service){this.service=service;}
 @GetMapping("/api/admin/courses/{courseId}/attendance") public Result list(@PathVariable String courseId){return Result.ok(service.teacherList(Ids.parse(courseId)));}
 @PostMapping("/api/admin/courses/{courseId}/attendance") public Result publish(@RequestAttribute("currentUser") User user,@PathVariable String courseId,@Valid @RequestBody Publish input){return Result.ok(service.publish(user,Ids.parse(courseId),input));}
 @GetMapping("/api/admin/attendance/{id}/students") public Result roster(@RequestAttribute("currentUser") User user,@PathVariable String id){return Result.ok(service.roster(user,Ids.parse(id)));}
 @PostMapping("/api/admin/attendance/{id}/close") public Result close(@RequestAttribute("currentUser") User user,@PathVariable String id){service.close(user,Ids.parse(id));return Result.ok(null);}
 @GetMapping("/api/student/attendance") public Result student(@RequestAttribute("currentUser") User user){return Result.ok(service.studentList(user));}
 @PostMapping("/api/student/attendance/{id}/sign") public Result sign(@RequestAttribute("currentUser") User user,@PathVariable String id,@Valid @RequestBody Sign input){service.sign(user,Ids.parse(id),input);return Result.ok(null);}
}
