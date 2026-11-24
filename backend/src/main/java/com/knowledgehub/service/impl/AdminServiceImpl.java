package com.knowledgehub.service.impl;

import com.knowledgehub.dto.response.AdminDashboardResponse;
import com.knowledgehub.dto.response.AdminDashboardResponse.ActivityPoint;
import com.knowledgehub.dto.response.AdminUserPageResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.UserRole;
import com.knowledgehub.repository.ChatMessageRepository;
import com.knowledgehub.repository.ChatSessionRepository;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.QuizAttemptRepository;
import com.knowledgehub.repository.TaskRepository;
import com.knowledgehub.repository.UsageEventRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.AdminService;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminServiceImpl implements AdminService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final DocumentRepository documentRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final TaskRepository taskRepository;
    private final UsageEventRepository usageEventRepository;

    public AdminServiceImpl(
            UserRepository userRepository,
            ProjectRepository projectRepository,
            DocumentRepository documentRepository,
            ChatSessionRepository chatSessionRepository,
            ChatMessageRepository chatMessageRepository,
            QuizAttemptRepository quizAttemptRepository,
            TaskRepository taskRepository,
            UsageEventRepository usageEventRepository) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.documentRepository = documentRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.taskRepository = taskRepository;
        this.usageEventRepository = usageEventRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard(int days) {
        int window = normalizeDays(days);
        Instant now = Instant.now();
        Instant rangeStart = now.minus(Duration.ofDays(window));
        Instant prevStart = rangeStart.minus(Duration.ofDays(window));

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByActive(true);
        long adminUsers = userRepository.countByRole(UserRole.ADMIN);
        long newUsers = userRepository.countByCreatedAtAfter(rangeStart);
        long newUsersPrev = userRepository.countByCreatedAtBetween(prevStart, rangeStart);

        long aiEvents = usageEventRepository.countByOccurredAtAfter(rangeStart);
        long aiEventsPrev = usageEventRepository.countByOccurredAtBetween(prevStart, rangeStart);
        long aiTokens = usageEventRepository.sumTotalTokens();

        Map<String, Long> usersByDay = toDailyMap(userRepository.countDailyCreatedSince(rangeStart));
        Map<String, Long> eventsByDay = toDailyMap(usageEventRepository.countDailySince(rangeStart));

        List<ActivityPoint> series = buildSeries(rangeStart, window, usersByDay, eventsByDay);

        Map<String, Long> roleDistribution = new LinkedHashMap<>();
        roleDistribution.put("ADMIN", adminUsers);
        roleDistribution.put("USER", userRepository.countByRole(UserRole.USER));

        List<UserResponse> recentUsers = userRepository.findTop8ByOrderByCreatedAtDesc().stream()
                .map(UserResponse::fromEntity)
                .toList();

        return new AdminDashboardResponse(
                totalUsers,
                activeUsers,
                adminUsers,
                newUsers,
                trendPct(newUsers, newUsersPrev),
                projectRepository.count(),
                documentRepository.count(),
                chatSessionRepository.count(),
                chatMessageRepository.count(),
                quizAttemptRepository.count(),
                taskRepository.count(),
                aiEvents,
                aiTokens,
                trendPct(aiEvents, aiEventsPrev),
                series,
                roleDistribution,
                recentUsers);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserPageResponse searchUsers(
            String search, UserRole role, Boolean active, int page, int size) {
        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int pageNumber = Math.max(page, 0);
        Pageable pageable = PageRequest.of(pageNumber, pageSize);

        String keyword = search == null || search.isBlank() ? null : search.trim();
        Page<User> result = userRepository.search(keyword, role, active, pageable);

        return AdminUserPageResponse.of(
                result.getContent().stream().map(UserResponse::fromEntity).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @Override
    public UserResponse setUserRole(UUID userId, UserRole role, UUID actingAdminId) {
        if (role == null) {
            throw new IllegalArgumentException("Role must not be empty");
        }
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + userId));

        if (userId.equals(actingAdminId) && role != UserRole.ADMIN) {
            throw new IllegalArgumentException("You cannot demote your own account");
        }
        if (user.getRole() == UserRole.ADMIN
                && role != UserRole.ADMIN
                && userRepository.countByRole(UserRole.ADMIN) <= 1) {
            throw new IllegalArgumentException("Platform must keep at least one admin");
        }

        user.setRole(role);
        return UserResponse.fromEntity(userRepository.save(user));
    }

    @Override
    public UserResponse setUserActive(UUID userId, boolean active, UUID actingAdminId) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + userId));

        if (userId.equals(actingAdminId) && !active) {
            throw new IllegalArgumentException("You cannot deactivate your own account");
        }
        if (!active && user.getRole() == UserRole.ADMIN
                && userRepository.countByRole(UserRole.ADMIN) <= 1) {
            throw new IllegalArgumentException("Platform must keep at least one active admin");
        }

        user.setActive(active);
        return UserResponse.fromEntity(userRepository.save(user));
    }

    private int normalizeDays(int days) {
        if (days <= 0) {
            return 30;
        }
        return Math.min(days, 90);
    }

    private Map<String, Long> toDailyMap(List<Object[]> rows) {
        Map<String, Long> map = new LinkedHashMap<>();
        if (rows == null) {
            return map;
        }
        for (Object[] row : rows) {
            if (row.length < 2 || row[0] == null) {
                continue;
            }
            map.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        return map;
    }

    /** Dựng chuỗi điểm liên tục từ ngày bắt đầu đến hôm nay, đệm 0 cho ngày trống. */
    private List<ActivityPoint> buildSeries(
            Instant rangeStart,
            int window,
            Map<String, Long> usersByDay,
            Map<String, Long> eventsByDay) {
        LocalDate start = rangeStart.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate today = Instant.now().atZone(ZoneOffset.UTC).toLocalDate();

        List<ActivityPoint> points = new ArrayList<>(window + 1);
        for (LocalDate date = start; !date.isAfter(today); date = date.plusDays(1)) {
            String key = date.toString();
            points.add(new ActivityPoint(
                    key,
                    usersByDay.getOrDefault(key, 0L),
                    eventsByDay.getOrDefault(key, 0L)));
        }
        return points;
    }

    private double trendPct(long current, long previous) {
        if (previous <= 0) {
            return current > 0 ? 100.0 : 0.0;
        }
        double pct = (current - previous) * 100.0 / previous;
        return Math.round(pct * 10.0) / 10.0;
    }
}
