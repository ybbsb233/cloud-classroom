package cn.edu.learning.controller;

import cn.edu.learning.exception.ApiException;
import cn.edu.learning.mapper.EnrollmentMapper;
import cn.edu.learning.mapper.UserMapper;
import cn.edu.learning.pojo.Models.*;
import cn.edu.learning.utils.Ids;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/student/courses")
public class EnrollmentController {
    private final EnrollmentMapper mapper;
    private final UserMapper users;

    public EnrollmentController(EnrollmentMapper mapper, UserMapper users) {
        this.mapper = mapper;
        this.users = users;
    }

    @GetMapping("/catalog")
    public Result catalog(@RequestAttribute("currentUser") User user, @RequestParam(defaultValue = "") String keyword) {
        if (keyword.length() > 100) throw new ApiException(400, "搜索词不能超过100字");
        return Result.ok(mapper.catalog(user.id(), keyword.trim()));
    }

    @PostMapping("/{id}/join")
    @Transactional
    public Result join(@RequestAttribute("currentUser") User user, @PathVariable String id) {
        long courseId = Ids.parse(id);
        Map<String, Object> course = mapper.lockCourse(courseId);
        if (course == null) throw new ApiException(404, "课程不存在");
        User teacher = users.byId(((Number) course.get("teacherId")).longValue());
        if (((Number) course.get("isOpen")).intValue() != 1 || teacher == null || teacher.enabled() != 1)
            throw new ApiException(409, "课程当前未开放加入");
        mapper.join(user.id(), courseId);
        return Result.ok(Map.of("joined", true));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public Result leave(@RequestAttribute("currentUser") User user, @PathVariable String id) {
        long courseId = Ids.parse(id);
        if (mapper.lockCourse(courseId) == null) throw new ApiException(404, "课程不存在");
        mapper.leave(user.id(), courseId);
        return Result.ok(Map.of("joined", false));
    }
}
