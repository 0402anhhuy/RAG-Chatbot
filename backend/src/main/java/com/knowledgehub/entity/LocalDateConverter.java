package com.knowledgehub.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.sql.Date;
import java.time.LocalDate;

/**
 * Chuyển LocalDate <-> DATE cho các cột ngày tháng. Dùng làm nơi chứa duy nhất
 * để tránh lặp AttributeConverter ở từng entity.
 */
@Converter(autoApply = false)
public class LocalDateConverter implements AttributeConverter<LocalDate, Date> {

    @Override
    public Date convertToDatabaseColumn(LocalDate attribute) {
        return attribute == null ? null : Date.valueOf(attribute);
    }

    @Override
    public LocalDate convertToEntityAttribute(Date dbData) {
        return dbData == null ? null : dbData.toLocalDate();
    }
}
