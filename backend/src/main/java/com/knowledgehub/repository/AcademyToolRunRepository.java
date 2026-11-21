package com.knowledgehub.repository;

import com.knowledgehub.entity.AcademyToolRun;
import com.knowledgehub.entity.AcademyToolType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AcademyToolRunRepository extends JpaRepository<AcademyToolRun, UUID> {

    List<AcademyToolRun> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<AcademyToolRun> findByUserIdAndToolTypeOrderByCreatedAtDesc(UUID userId, AcademyToolType toolType);

    long countByUserIdAndToolType(UUID userId, AcademyToolType toolType);

    long countByUserIdAndToolTypeAndStatus(UUID userId, AcademyToolType toolType, String status);
}
