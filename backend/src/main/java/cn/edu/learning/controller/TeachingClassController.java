package cn.edu.learning.controller;

import cn.edu.learning.pojo.Models.*;
import cn.edu.learning.service.TeachingClassService;
import cn.edu.learning.service.TeachingClassService.*;
import cn.edu.learning.utils.Ids;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/classes")
public class TeachingClassController {
    private final TeachingClassService service;

    public TeachingClassController(TeachingClassService service) {
        this.service = service;
    }

    @GetMapping
    public Result list(@RequestAttribute("currentUser") User user, @RequestParam(required = false) String courseId) {
        return Result.ok(service.list(user, Ids.optional(courseId)));
    }

    @PostMapping
    public Result create(@RequestAttribute("currentUser") User user, @Valid @RequestBody ClassInput body) {
        return Result.ok(service.create(user, body));
    }

    @GetMapping("/{id}")
    public Result detail(@RequestAttribute("currentUser") User user, @PathVariable String id) {
        return Result.ok(service.detail(user, Ids.parse(id)));
    }

    @PutMapping("/{id}")
    public Result update(@RequestAttribute("currentUser") User user, @PathVariable String id, @Valid @RequestBody ClassUpdate body) {
        return Result.ok(service.update(user, Ids.parse(id), body));
    }

    @DeleteMapping("/{id}")
    public Result archive(@RequestAttribute("currentUser") User user, @PathVariable String id) {
        service.archive(user, Ids.parse(id));
        return Result.ok(null);
    }

    @GetMapping("/{id}/students")
    public Result students(@RequestAttribute("currentUser") User user, @PathVariable String id, @RequestParam(defaultValue = "") String keyword) {
        return Result.ok(service.students(user, Ids.parse(id), keyword));
    }

    @GetMapping("/{id}/candidates")
    public Result candidates(@RequestAttribute("currentUser") User user, @PathVariable String id, @RequestParam(defaultValue = "") String keyword) {
        return Result.ok(service.candidates(user, Ids.parse(id), keyword));
    }

    @PostMapping("/{id}/students")
    public Result add(@RequestAttribute("currentUser") User user, @PathVariable String id, @Valid @RequestBody Members body) {
        service.add(user, Ids.parse(id), body);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}/students/{sid}")
    public Result remove(@RequestAttribute("currentUser") User user, @PathVariable String id, @PathVariable String sid) {
        service.remove(user, Ids.parse(id), Ids.parse(sid));
        return Result.ok(null);
    }
}
