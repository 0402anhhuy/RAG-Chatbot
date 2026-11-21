package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.ProviderModelPriceRequest;
import com.knowledgehub.dto.request.UsageEventRequest;
import com.knowledgehub.dto.response.ProjectAnalyticsResponse;
import com.knowledgehub.dto.response.ProjectAnalyticsResponse.AbandonedModel;
import com.knowledgehub.dto.response.ProjectAnalyticsResponse.DailyPoint;
import com.knowledgehub.dto.response.ProjectAnalyticsResponse.ProviderRow;
import com.knowledgehub.dto.response.ProjectAnalyticsResponse.Summary;
import com.knowledgehub.dto.response.ProjectAnalyticsResponse.UserRow;
import com.knowledgehub.dto.response.ProviderModelPriceResponse;
import com.knowledgehub.dto.response.UsageEventResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProviderModelPrice;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.UsageActorType;
import com.knowledgehub.entity.UsageEvent;
import com.knowledgehub.entity.User;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.ProviderModelPriceRepository;
import com.knowledgehub.repository.UsageEventRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter DATE_KEY = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
    private static final String TASK_ACTIVE = "ACTIVE";
    private static final String TASK_ABANDONED = "ABANDONED";
    private static final String OUTCOME_COMPLETED = "COMPLETED";
    private static final String OUTCOME_SKIPPED = "SKIPPED";
    private static final String PROVIDER_LABEL_FORMAT = "%s / %s";

    private final ProjectRepository projectRepository;
    private final ProviderModelPriceRepository priceRepository;
    private final UsageEventRepository usageEventRepository;
    private final UserRepository userRepository;

    // ------------------------------------------------------------------ read
    @Override
    @Transactional(readOnly = true)
    public ProjectAnalyticsResponse getProjectAnalytics(UUID projectId, YearMonth month) {
        Project project = findProject(projectId);
        YearMonth target = month != null ? month : YearMonth.now(ZONE);

        Instant from = target.atDay(1).atStartOfDay(ZONE).toInstant();
        Instant to = target.plusMonths(1).atDay(1).atStartOfDay(ZONE).toInstant();
        List<UsageEvent> events = usageEventRepository
                .findByProjectIdAndOccurredAtBetweenOrderByOccurredAtAsc(projectId, from, to);

        // Mọi lượt dùng đều được quy ra tiền từ bảng giá tại thời điểm đọc.
        Map<UUID, Double> costByEvent = new LinkedHashMap<>();
        events.forEach(event -> costByEvent.put(event.getId(), costOf(event)));
        double totalCost = sum(costByEvent.values());

        Map<String, DailyPoint> daily = buildDaily(target, events, costByEvent);
        List<ProviderRow> providers = buildProviders(events, costByEvent, totalCost);
        List<UserRow> users = buildUsers(events, costByEvent);
        Summary summary = buildSummary(events, costByEvent, totalCost);

        return new ProjectAnalyticsResponse(
                project.getName(),
                target.toString(),
                target.atDay(1).format(MONTH_LABEL),
                target.atDay(1).format(DATE_KEY),
                target.atEndOfMonth().format(DATE_KEY),
                new ArrayList<>(daily.keySet()),
                summary,
                new ArrayList<>(daily.values()),
                providers,
                users);
    }

    // ----------------------------------------------------------------- write
    @Override
    public UsageEventResponse recordUsage(UUID projectId, UsageEventRequest request) {
        Project project = findProject(projectId);
        if (request == null) {
            throw new IllegalArgumentException("usage payload is required");
        }
        if (request.provider() == null) {
            throw new IllegalArgumentException("provider is required");
        }

        // Provider/model do client gửi lên (chat session đã biết sẵn hai giá trị này).
        UsageEvent event = new UsageEvent();
        event.setProject(project);
        event.setUser(resolveUser(project, request.userId()));
        event.setProvider(request.provider());
        event.setModel(resolveModel(request));
        event.setPromptTokens(nonNegative(request.promptTokens()));
        event.setCompletionTokens(nonNegative(request.completionTokens()));
        event.setCacheReadTokens(nonNegative(request.cacheReadTokens()));
        event.setCacheWriteTokens(nonNegative(request.cacheWriteTokens()));
        event.setTotalTokens(event.getPromptTokens() + event.getCompletionTokens()
                + event.getCacheReadTokens() + event.getCacheWriteTokens());
        event.setSteps((int) Math.min(nonNegative(request.steps()), Integer.MAX_VALUE));
        event.setLinesAdded((int) Math.min(nonNegative(request.linesAdded()), Integer.MAX_VALUE));
        event.setLinesRemoved((int) Math.min(nonNegative(request.linesRemoved()), Integer.MAX_VALUE));
        event.setFilesChanged((int) Math.min(nonNegative(request.filesChanged()), Integer.MAX_VALUE));
        event.setTaskStatus(TASK_ABANDONED.equalsIgnoreCase(safe(request.taskStatus()))
                ? TASK_ABANDONED
                : TASK_ACTIVE);
        boolean completed = isCompleted(request);
        event.setOutcomeStatus(completed ? OUTCOME_COMPLETED : OUTCOME_SKIPPED);
        event.setActorType(isPersonal(request) ? UsageActorType.PERSONAL : UsageActorType.PLATFORM);
        event.setOccurredAt(parseInstant(request.occurredAt()));

        UsageEvent saved = usageEventRepository.save(event);
        double cost = request.costOverride() != null && request.costOverride() > 0
                ? round(request.costOverride())
                : costOf(saved);

        User user = saved.getUser();
        return new UsageEventResponse(
                saved.getId(),
                project.getId(),
                user != null ? user.getId() : null,
                user != null ? user.getName() : null,
                saved.getProvider(),
                saved.getModel(),
                saved.getTaskStatus(),
                saved.getOutcomeStatus(),
                saved.getPromptTokens(),
                saved.getCompletionTokens(),
                saved.getCacheReadTokens(),
                saved.getCacheWriteTokens(),
                saved.getTotalTokens(),
                saved.getSteps(),
                saved.getLinesAdded(),
                saved.getLinesRemoved(),
                saved.getFilesChanged(),
                cost,
                saved.getActorType().name(),
                saved.getOccurredAt().toString());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProviderModelPriceResponse> listPrices(ProviderType provider) {
        List<ProviderModelPrice> prices = provider == null
                ? priceRepository.findAll()
                : priceRepository.findByProviderOrderByModelAsc(provider);
        return prices.stream().map(ProviderModelPriceResponse::fromEntity).toList();
    }

    @Override
    public ProviderModelPriceResponse upsertPrice(ProviderType provider, ProviderModelPriceRequest request) {
        if (provider == null) {
            throw new IllegalArgumentException("provider is required");
        }
        if (request == null || request.model() == null || request.model().isBlank()) {
            throw new IllegalArgumentException("model is required");
        }
        String model = request.model().trim();
        ProviderModelPrice price = priceRepository
                .findByProviderAndModelIgnoreCase(provider, model)
                .orElseGet(() -> {
                    ProviderModelPrice created = new ProviderModelPrice();
                    created.setProvider(provider);
                    created.setModel(model);
                    return created;
                });
        price.setInputPerMillion(request.inputPerMillion());
        price.setOutputPerMillion(request.outputPerMillion());
        price.setCacheReadPerMillion(zeroIfNull(request.cacheReadPerMillion()));
        price.setCacheWritePerMillion(zeroIfNull(request.cacheWritePerMillion()));
        return ProviderModelPriceResponse.fromEntity(priceRepository.save(price));
    }

    // ---------------------------------------------------------------- groups
    private Map<String, DailyPoint> buildDaily(YearMonth month, List<UsageEvent> events,
            Map<UUID, Double> costByEvent) {
        // Đủ mọi ngày của tháng (kể cả ngày 0 chi phí) để biểu đồ không bị đứt quãng.
        // [0]=project, [1]=personal, [2]=total, [3]=tokensIn, [4]=tokensOut, [5]=added, [6]=removed
        Map<String, double[]> bucket = new LinkedHashMap<>();
        for (int day = 1; day <= month.lengthOfMonth(); day++) {
            bucket.put(month.atDay(day).format(DATE_KEY), new double[7]);
        }
        for (UsageEvent event : events) {
            String key = LocalDate.ofInstant(event.getOccurredAt(), ZONE).format(DATE_KEY);
            double[] point = bucket.get(key);
            if (point == null) {
                continue;
            }
            double cost = costByEvent.getOrDefault(event.getId(), 0d);
            if (event.getActorType() == UsageActorType.PERSONAL) {
                point[1] += cost;
            } else {
                point[0] += cost;
            }
            point[2] += cost;
            point[3] += event.getPromptTokens();
            point[4] += event.getCompletionTokens();
            point[5] += event.getLinesAdded();
            point[6] += event.getLinesRemoved();
        }

        Map<String, DailyPoint> daily = new LinkedHashMap<>();
        bucket.forEach((key, values) -> {
            LocalDate date = LocalDate.parse(key, DATE_KEY);
            daily.put(key, new DailyPoint(
                    key,
                    date.format(DAY_LABEL),
                    round(values[0]),
                    round(values[1]),
                    round(values[2]),
                    (long) values[3],
                    (long) values[4],
                    (int) Math.round(values[5]),
                    (int) Math.round(values[6])));
        });
        return daily;
    }

    private List<ProviderRow> buildProviders(List<UsageEvent> events, Map<UUID, Double> costByEvent,
            double totalCost) {
        Map<String, ProviderRow> rows = new LinkedHashMap<>();
        Map<String, double[]> counters = new LinkedHashMap<>();

        for (UsageEvent event : events) {
            String key = PROVIDER_LABEL_FORMAT.formatted(event.getProvider(), event.getModel());
            counters.computeIfAbsent(key, ignored -> new double[6]);
            double[] values = counters.get(key);
            values[0] += costByEvent.getOrDefault(event.getId(), 0d);
            values[1] += event.getPromptTokens();
            values[2] += event.getCompletionTokens();
            values[3] += event.getCacheReadTokens();
            values[4] += event.getCacheWriteTokens();
            values[5] += event.getSteps();
        }

        counters.forEach((key, values) -> {
            String[] parts = key.split(" / ", 2);
            rows.put(key, new ProviderRow(
                    parts[0],
                    parts.length > 1 ? parts[1] : "",
                    round(values[0]),
                    (long) values[1],
                    (long) values[2],
                    (long) values[3],
                    (long) values[4],
                    (int) values[5],
                    totalCost > 0 ? round(values[0] * 100d / totalCost) : 0d));
        });
        return rows.values().stream()
                .sorted(Comparator.comparingDouble(ProviderRow::cost).reversed())
                .toList();
    }

    private List<UserRow> buildUsers(List<UsageEvent> events, Map<UUID, Double> costByEvent) {
        // Gom theo user; lượt do automation chạy gom vào một dòng "Automation".
        Map<String, double[]> counters = new LinkedHashMap<>();
        Map<String, Integer> runCounts = new LinkedHashMap<>();
        Map<String, User> profiles = new LinkedHashMap<>();

        for (UsageEvent event : events) {
            User user = event.getUser();
            String key = user != null ? user.getId().toString() : "automation";
            profiles.putIfAbsent(key, user);
            counters.computeIfAbsent(key, ignored -> new double[10]);
            runCounts.merge(key, 1, Integer::sum);
            double[] values = counters.get(key);
            double cost = costByEvent.getOrDefault(event.getId(), 0d);
            if (event.getActorType() == UsageActorType.PERSONAL) {
                values[1] += cost;
            } else {
                values[0] += cost;
            }
            values[2] += event.getPromptTokens();
            values[3] += event.getCompletionTokens();
            values[4] += event.getCacheReadTokens();
            values[5] += event.getCacheWriteTokens();
            values[6] += event.getSteps();
            values[7] += event.getLinesAdded();
            values[8] += event.getLinesRemoved();
            values[9] += event.getFilesChanged();
        }

        List<UserRow> rows = new ArrayList<>();
        counters.forEach((key, values) -> {
            User user = profiles.get(key);
            rows.add(new UserRow(
                    user != null ? user.getId().toString() : null,
                    user != null ? user.getName() : "Automation",
                    user != null ? user.getEmail() : "",
                    round(values[0]),
                    round(values[1]),
                    (long) values[2],
                    (long) values[3],
                    (long) values[4],
                    (long) values[5],
                    (int) values[6],
                    (int) values[7],
                    (int) values[8],
                    (int) values[9],
                    runCounts.getOrDefault(key, 0)));
        });
        return rows.stream()
                .sorted(Comparator.comparingDouble((UserRow row) -> -(row.projectCost() + row.personalCost())))
                .toList();
    }

    private Summary buildSummary(List<UsageEvent> events, Map<UUID, Double> costByEvent, double totalCost) {
        long tokensIn = 0;
        long tokensOut = 0;
        long cacheRead = 0;
        long cacheWrite = 0;
        int steps = 0;
        int linesAdded = 0;
        int linesRemoved = 0;
        int filesChanged = 0;
        int runs = 0;
        int tasks = 0;
        int completed = 0;
        int abandonedTasks = 0;
        double projectCost = 0d;
        double personalCost = 0d;
        double abandonedCost = 0d;
        long abandonedTokens = 0;

        for (UsageEvent event : events) {
            double cost = costByEvent.getOrDefault(event.getId(), 0d);
            if (event.getActorType() == UsageActorType.PERSONAL) {
                personalCost += cost;
            } else {
                projectCost += cost;
            }
            tokensIn += event.getPromptTokens();
            tokensOut += event.getCompletionTokens();
            cacheRead += event.getCacheReadTokens();
            cacheWrite += event.getCacheWriteTokens();
            steps += event.getSteps();
            linesAdded += event.getLinesAdded();
            linesRemoved += event.getLinesRemoved();
            filesChanged += event.getFilesChanged();
            runs++;

            if (TASK_ABANDONED.equals(taskStatusOf(event))) {
                abandonedTasks++;
                abandonedCost += cost;
                abandonedTokens += event.getTotalTokens();
            } else {
                tasks++;
            }
            if (OUTCOME_COMPLETED.equals(event.getOutcomeStatus())) {
                completed++;
            }
        }

        // Chi phí của task bị bỏ dở, chỉ dùng để hiển thị %% token lãng phí.
        Map<String, Double> abandonedByModel = new LinkedHashMap<>();
        for (UsageEvent event : events) {
            if (!TASK_ABANDONED.equals(taskStatusOf(event))) {
                continue;
            }
            String key = PROVIDER_LABEL_FORMAT.formatted(event.getProvider(), event.getModel());
            abandonedByModel.merge(key, costByEvent.getOrDefault(event.getId(), 0d), Double::sum);
        }
        List<AbandonedModel> abandoned = abandonedByModel.entrySet().stream()
                .map(entry -> new AbandonedModel(entry.getKey(), round(entry.getValue())))
                .sorted(Comparator.comparingDouble(AbandonedModel::cost).reversed())
                .toList();

        return new Summary(
                round(totalCost),
                round(projectCost),
                round(personalCost),
                tokensIn,
                tokensOut,
                cacheRead,
                cacheWrite,
                steps,
                tasks,
                completed,
                abandonedTasks,
                linesAdded,
                linesRemoved,
                linesAdded - linesRemoved,
                filesChanged,
                runs,
                round(abandonedCost),
                abandonedTokens,
                abandoned);
    }

    // ---------------------------------------------------------------- prices
    /**
     * Tiền của một lượt dùng = token × đơn giá model. Model chưa khai báo giá
     * thì tính 0 để không bịa ra con số.
     */
    private double costOf(UsageEvent event) {
        ProviderModelPrice price = priceRepository
                .findByProviderAndModelIgnoreCase(event.getProvider(), event.getModel())
                .orElse(null);
        if (price == null) {
            return 0d;
        }
        BigDecimal million = BigDecimal.valueOf(1_000_000);
        BigDecimal cost = price.getInputPerMillion()
                .multiply(BigDecimal.valueOf(event.getPromptTokens()))
                .add(price.getOutputPerMillion().multiply(BigDecimal.valueOf(event.getCompletionTokens())))
                .add(price.getCacheReadPerMillion().multiply(BigDecimal.valueOf(event.getCacheReadTokens())))
                .add(price.getCacheWritePerMillion().multiply(BigDecimal.valueOf(event.getCacheWriteTokens())))
                .divide(million, 6, RoundingMode.HALF_UP);
        return cost.doubleValue();
    }

    // ---------------------------------------------------------------- helpers
    private Project findProject(UUID projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));
    }

    /**
     * Lượt dùng thuộc về user gửi lên. Không gửi thì mặc định là owner project
     * để bảng By User không bị dòng rỗng.
     */
    private User resolveUser(Project project, UUID userId) {
        if (userId != null) {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + userId));
        }
        return project.getOwner();
    }

    private String resolveModel(UsageEventRequest request) {
        return request.model() == null || request.model().isBlank()
                ? "unknown"
                : request.model().trim();
    }

    private boolean isPersonal(UsageEventRequest request) {
        return Boolean.TRUE.equals(request.personal());
    }

    private boolean isCompleted(UsageEventRequest request) {
        if (Boolean.TRUE.equals(request.completed())) {
            return true;
        }
        return OUTCOME_COMPLETED.equalsIgnoreCase(safe(request.outcomeStatus()));
    }

    private String taskStatusOf(UsageEvent event) {
        return event.getTaskStatus() == null || event.getTaskStatus().isBlank()
                ? TASK_ACTIVE
                : event.getTaskStatus();
    }

    private long nonNegative(Long value) {
        return value == null ? 0L : Math.max(value, 0L);
    }

    private long nonNegative(long value) {
        return Math.max(value, 0L);
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return Instant.now();
        }
        try {
            return Instant.parse(value.trim());
        } catch (DateTimeParseException ignored) {
            return Instant.now();
        }
    }

    private double sum(Iterable<Double> values) {
        double total = 0d;
        for (Double value : values) {
            if (value != null) {
                total += value;
            }
        }
        return total;
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(6, RoundingMode.HALF_UP).doubleValue();
    }
}
