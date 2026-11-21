package com.knowledgehub.controller.academyhub;

import com.knowledgehub.dto.request.AcademySettingUpdateRequest;
import com.knowledgehub.dto.response.AcademySettingResponse;
import com.knowledgehub.service.interfaces.AcademySettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Tab Settings của Academy Hub: hồ sơ sinh viên, tuỳ chọn AI Tutor, mục tiêu
 * học tập và nhắc nhở.
 *
 * <p>
 * Cả hai endpoint đều trả về cùng một {@link AcademySettingResponse} để FE cập
 * nhật form bằng một nguồn dữ liệu duy nhất.
 * </p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users/{userId}/academy-settings")
public class AcademySettingController {

    private final AcademySettingService academySettingService;

    @GetMapping
    public ResponseEntity<AcademySettingResponse> getSetting(@PathVariable UUID userId) {
        return ResponseEntity.ok(academySettingService.getSetting(userId));
    }

    /**
     * Form settings là một khối nên lưu bằng PUT (ghi đè toàn bộ).
     */
    @PutMapping
    public ResponseEntity<AcademySettingResponse> updateSetting(
            @PathVariable UUID userId,
            @Valid @RequestBody AcademySettingUpdateRequest request) {
        return ResponseEntity.ok(academySettingService.updateSetting(userId, request));
    }
}
