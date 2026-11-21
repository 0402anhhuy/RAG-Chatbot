package com.knowledgehub.controller.academyhub;

import com.knowledgehub.dto.response.AcademyHomeResponse;
import com.knowledgehub.service.interfaces.AcademyHomeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Dashboard của tab Home (Academy Hub).
 *
 * <p>
 * Home không có bảng dữ liệu riêng: endpoint này tổng hợp từ các tab khác (khóa
 * học, lượt làm quiz, tin nhắn trợ lý, ghi chú, lượt chạy tool, settings) trong
 * cùng workspace. Một request duy nhất để FE render toàn trang.
 * </p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/academy-home")
public class AcademyHomeController {

    private final AcademyHomeService academyHomeService;

    /**
     * @param ownerId người học; dùng để tìm workspace và tên hiển thị
     * @param workspaceId workspace đang mở trong Academy Hub (bỏ trống thì lấy
     * workspace đầu tiên của ownerId)
     * @param range 7d | 30d | all (mặc định 30d) — cửa sổ cho KPI Quizzes
     * Solved và Study Time
     */
    @GetMapping
    public ResponseEntity<AcademyHomeResponse> getHome(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String range) {
        return ResponseEntity.ok(academyHomeService.getHome(ownerId, workspaceId, range));
    }
}
