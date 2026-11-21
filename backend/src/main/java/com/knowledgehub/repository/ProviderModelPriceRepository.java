package com.knowledgehub.repository;

import com.knowledgehub.entity.ProviderModelPrice;
import com.knowledgehub.entity.ProviderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProviderModelPriceRepository extends JpaRepository<ProviderModelPrice, UUID> {

    Optional<ProviderModelPrice> findByProviderAndModelIgnoreCase(ProviderType provider, String model);

    List<ProviderModelPrice> findByProviderOrderByModelAsc(ProviderType provider);
}
