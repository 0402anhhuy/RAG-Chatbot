package com.knowledgehub.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CredentialCipherTest {

    @Test
    void encryptsAndDecryptsRoundTrip() {
        new CredentialCipher("test-credential-key");

        String encrypted = CredentialCipher.encrypt("sk-live-1234567890");

        assertTrue(CredentialCipher.isEncrypted(encrypted));
        assertFalse(encrypted.contains("sk-live-1234567890"));
        assertEquals("sk-live-1234567890", CredentialCipher.decrypt(encrypted));
    }

    @Test
    void keepsLegacyPlaintextReadable() {
        new CredentialCipher("test-credential-key");

        assertEquals("legacy-plain-key", CredentialCipher.decrypt("legacy-plain-key"));
    }

    @Test
    void rejectsTamperedCiphertext() {
        new CredentialCipher("test-credential-key");
        String encrypted = CredentialCipher.encrypt("sk-secret");
        String tampered = encrypted.substring(0, encrypted.length() - 2) + "AA";

        assertThrows(IllegalStateException.class, () -> CredentialCipher.decrypt(tampered));
    }
}
