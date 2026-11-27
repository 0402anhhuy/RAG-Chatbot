package com.knowledgehub.security;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Một lần quét các bảng credential để mã hoá key còn ở dạng plaintext.
 * Idempotent: chỉ cập nhật dòng chưa có prefix {@code enc:v1:}.
 */
@Component
public class CredentialEncryptionMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CredentialEncryptionMigration.class);
    private static final List<String> TABLES = List.of("project_llm_credentials", "user_llm_providers");

    private final JdbcTemplate jdbcTemplate;
    private final boolean enabled;

    public CredentialEncryptionMigration(
            JdbcTemplate jdbcTemplate,
            @Value("${app.security.encrypt-legacy-credentials:true}") boolean enabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        for (String table : TABLES) {
            migrate(table);
        }
    }

    protected int migrate(String table) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id, api_key FROM " + table);
            int updated = 0;
            for (Map<String, Object> row : rows) {
                Object rawValue = row.get("api_key");
                if (!(rawValue instanceof String raw) || raw.isBlank() || CredentialCipher.isEncrypted(raw)) {
                    continue;
                }
                jdbcTemplate.update(
                        "UPDATE " + table + " SET api_key = ? WHERE id = ?",
                        CredentialCipher.encrypt(raw),
                        row.get("id"));
                updated++;
            }
            if (updated > 0) {
                log.info("Encrypted {} legacy provider credential(s) in {}", updated, table);
            }
            return updated;
        } catch (DataAccessException exception) {
            // Bảng chưa tồn tại (schema quản lý ngoài) → bỏ qua, không chặn startup.
            log.debug("Skipping credential encryption migration for {}: {}", table, exception.getMessage());
            return 0;
        }
    }
}
