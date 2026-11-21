package com.knowledgehub.repository;

import com.knowledgehub.entity.AcademySetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Tuỳ chọn tab Settings của Academy Hub — mỗi user một bản ghi.
 */
public interface AcademySettingRepository extends JpaRepository<AcademySetting, UUID> {

    Optional<AcademySetting> findByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
