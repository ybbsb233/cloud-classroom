package cn.edu.learning.controller;

import cn.edu.learning.mapper.CourseMapper;
import cn.edu.learning.pojo.Models.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScheduleController {
 private final CourseMapper courses;
 public ScheduleController(CourseMapper courses){this.courses=courses;}
 @GetMapping("/api/schedule") public Result schedule(){return Result.ok(courses.schedule());}
}
