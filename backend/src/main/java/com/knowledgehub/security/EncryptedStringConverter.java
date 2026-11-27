package com.knowledgehub.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Tự động mã hoá/giải mã cột API key khi đọc/ghi entity.
 * Dữ liệu legacy (plaintext) vẫn đọc được và được mã hoá ở lần ghi sau.
 */
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return CredentialCipher.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return CredentialCipher.decrypt(dbData);
    }
}
