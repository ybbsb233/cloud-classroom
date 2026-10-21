package cn.edu.learning.interceptor;

import cn.edu.learning.exception.ApiException;
import cn.edu.learning.pojo.Models.User;
import cn.edu.learning.service.AuthService;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final AuthService auth;

    public AuthInterceptor(AuthService auth) {
        this.auth = auth;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        cn.edu.learning.utils.CourseScope.clear();
        String path = request.getRequestURI();
        if (path.equals("/api/auth/login") && request.getMethod().equals("POST")) return true;
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) throw new ApiException(401, "请先登录");
        User user = auth.verify(header.substring(7));
        request.setAttribute("currentUser", user);
        if (path.startsWith("/api/admin/") && !user.role().equals("TEACHER"))
            throw new ApiException(403, "需要教师权限");
        if (path.startsWith("/api/student/") && !user.role().equals("STUDENT"))
            throw new ApiException(403, "需要学生身份");
        cn.edu.learning.utils.CourseScope.set(user);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception error) {
        cn.edu.learning.utils.CourseScope.clear();
    }
}
