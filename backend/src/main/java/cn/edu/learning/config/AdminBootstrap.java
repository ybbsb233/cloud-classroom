package cn.edu.learning.config;

import cn.edu.learning.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final UserMapper users;
    private final String initial;

    public AdminBootstrap(UserMapper u, @Value("${app.bootstrap-admin-password:}") String password) {
        users = u;
        initial = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        var encoder = new BCryptPasswordEncoder();
        for (int n = 1; n <= 2; n++) {
            String username = "teacher0" + n;
            if (users.byUsername(username) != null) continue;
            if (initial.length() < 6 || initial.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
                throw new IllegalStateException("Set ADMIN_INITIAL_PASSWORD (6 to 72 bytes) for first startup");
            users.insert(username, "教师" + n, encoder.encode(initial), "TEACHER");
        }
    }
}
