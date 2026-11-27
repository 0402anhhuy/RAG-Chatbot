package com.knowledgehub.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Mã hoá API key LLM khi lưu DB (AES-256-GCM).
 *
 * <p>
 * Định dạng lưu: {@code enc:v1:<base64(iv||ciphertext||tag)>}. Giá trị legacy
 * không có prefix được đọc nguyên văn và sẽ được mã hoá ở lần ghi/migration kế
 * tiếp.
 * </p>
 */
@Component
public class CredentialCipher {

    private static final Logger log = LoggerFactory.getLogger(CredentialCipher.class);
    private static final String PREFIX = "enc:v1:";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final byte[] DEV_SEED =
            "knowledgehub-local-development-credential-key".getBytes(StandardCharsets.UTF_8);

    private static volatile SecretKey key = derive(null);

    public CredentialCipher(@Value("${app.security.credential-key:}") String configured) {
        key = derive(configured);
        if (configured == null || configured.isBlank()) {
            log.warn("app.security.credential-key is not set; using the built-in development key. "
                    + "Set APP_SECURITY_CREDENTIAL_KEY in production.");
        }
    }

    public static boolean isEncrypted(String value) {
        return value != null && value.startsWith(PREFIX);
    }

    public static String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank() || isEncrypted(plaintext)) {
            return plaintext;
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] sealed = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + sealed.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(sealed, 0, payload, iv.length, sealed.length);
            return PREFIX + Base64.getEncoder().encodeToString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not encrypt provider credential", exception);
        }
    }

    public static String decrypt(String stored) {
        if (stored == null || stored.isBlank() || !isEncrypted(stored)) {
            return stored;
        }
        try {
            byte[] payload = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            if (payload.length <= IV_BYTES) {
                throw new IllegalArgumentException("encrypted payload is too short");
            }
            byte[] iv = new byte[IV_BYTES];
            System.arraycopy(payload, 0, iv, 0, IV_BYTES);
            byte[] sealed = new byte[payload.length - IV_BYTES];
            System.arraycopy(payload, IV_BYTES, sealed, 0, sealed.length);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(sealed), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not decrypt provider credential; check the credential key",
                    exception);
        }
    }

    private static SecretKey derive(String configured) {
        byte[] material;
        if (configured == null || configured.isBlank()) {
            material = DEV_SEED;
        } else {
            try {
                material = Base64.getDecoder().decode(configured.trim());
            } catch (IllegalArgumentException exception) {
                material = configured.trim().getBytes(StandardCharsets.UTF_8);
            }
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(material);
            return new SecretKeySpec(digest, "AES");
        } catch (Exception exception) {
            throw new IllegalStateException("Could not initialise credential cipher", exception);
        }
    }
}
