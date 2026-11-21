package com.knowledgehub.repository;

import com.knowledgehub.entity.WorkbenchConversationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WorkbenchConversationSettingsRepository
        extends JpaRepository<WorkbenchConversationSettings, UUID> {

    Optional<WorkbenchConversationSettings> findByConversationId(UUID conversationId);
}
