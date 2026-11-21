package com.knowledgehub.repository;

import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.UserLlmProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserLlmProviderRepository extends JpaRepository<UserLlmProvider, UUID> {

    List<UserLlmProvider> findByUserIdOrderByProviderTypeAsc(UUID userId);

    Optional<UserLlmProvider> findByUserIdAndProviderType(UUID userId, ProviderType providerType);
}
