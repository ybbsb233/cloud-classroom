package cn.edu.learning.utils;

import cn.edu.learning.pojo.Models.User;

/**
 * Per-request identity for shared SQL course filters. Cleared by the interceptor.
 */
public final class CourseScope {
    private static final ThreadLocal<User> CURRENT = new ThreadLocal<>();

    private CourseScope() {
    }

    public static void set(User user) {
        CURRENT.set(user);
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static Long userId() {
        return CURRENT.get() == null ? null : CURRENT.get().id();
    }

    public static String role() {
        return CURRENT.get() == null ? "" : CURRENT.get().role();
    }
}
