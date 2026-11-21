package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.AcademySettingUpdateRequest;
import com.knowledgehub.dto.response.AcademySettingResponse;

import java.util.UUID;

/**
 * Tuỳ chọn của tab Settings trong Academy Hub (hồ sơ sinh viên, AI Tutor, mục
 * tiêu học tập, nhắc nhở).
 */
public interface AcademySettingService {

    /**
     * Đọc tuỳ chọn đã lưu. Chưa lưu lần nào thì trả giá trị mặc định với
     * {@code saved=false}.
     */
    AcademySettingResponse getSetting(UUID userId);

    /**
     * Ghi đè toàn bộ tuỳ chọn (form là một khối duy nhất nên không cần PATCH
     * từng phần).
     */
    AcademySettingResponse updateSetting(UUID userId, AcademySettingUpdateRequest request);
}
