package com.knowledgehub.repository;

import com.knowledgehub.entity.UserSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserSettingRepository extends JpaRepository<UserSetting, UUID> {

    Optional<UserSetting> findByUserId(UUID userId);
}
