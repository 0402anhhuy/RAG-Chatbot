// Nguồn dữ liệu chuẩn cho chat agent: mỗi message của assistant là một chuỗi
// parts[] giữ đúng thứ tự thời gian. Mọi view (Stream / Graph) chỉ ĐỌC state này,
// nên chuyển view giữa lúc stream không thể mất dữ liệu.
//
// Event từ stream:
//   thinking_delta {id,text} | text_delta {id,text}
//   tool_start {id,name,input} | tool_result {id,status,output,meta}
//   done {} | error {message}

export const PART_TYPE = Object.freeze({
    THINKING: "thinking",
    TEXT: "text",
    TOOL: "tool",
});

const isTerminal = (status) => status !== "running";

/**
 * Part thinking/text đang running chuyển success khi một part KHÁC bắt đầu
 * hoặc khi stream kết thúc. Nhờ vậy không part nào kẹt ở "running".
 */
const closeRunningTextParts = (parts, exceptId) =>
    parts.map((part) =>
        part.status === "running" &&
        part.id !== exceptId &&
        (part.type === PART_TYPE.THINKING || part.type === PART_TYPE.TEXT)
            ? { ...part, status: "success", endedAt: Date.now() }
            : part,
    );

const upsertDelta = (parts, { id, text, type }) => {
    const index = parts.findIndex((part) => part.id === id);
    if (index === -1) {
        const closed = closeRunningTextParts(parts, id);
        return [
            ...closed,
            {
                id,
                type,
                status: "running",
                text: text || "",
                startedAt: Date.now(),
            },
        ];
    }
    const next = [...parts];
    next[index] = { ...next[index], text: (next[index].text || "") + (text || "") };
    return next;
};

const startTool = (parts, { id, name, input }) => {
    const closed = closeRunningTextParts(parts, id);
    const existing = closed.findIndex((part) => part.id === id);
    const tool = {
        id,
        type: PART_TYPE.TOOL,
        status: "running",
        name: name || "tool",
        input: input || null,
        output: "",
        meta: null,
        startedAt: Date.now(),
    };
    if (existing === -1) return [...closed, tool];
    const next = [...closed];
    next[existing] = { ...next[existing], ...tool };
    return next;
};

const resultTool = (parts, { id, status, output, meta }) =>
    parts.map((part) =>
        part.id === id && part.type === PART_TYPE.TOOL
            ? {
                  ...part,
                  // Thiếu status thì coi như thành công — không để kẹt running.
                  status: status || "success",
                  output: output ?? part.output ?? "",
                  meta: meta ?? part.meta ?? null,
                  endedAt: Date.now(),
              }
            : part,
    );

const failTool = (parts, message) =>
    parts.map((part) =>
        part.type === PART_TYPE.TOOL && part.status === "running"
            ? {
                  ...part,
                  status: "error",
                  output: part.output || message || "",
                  endedAt: Date.now(),
              }
            : part,
    );

/** Áp một event stream lên mảng parts (thuần, không mutate). */
export const applyEvent = (parts, event) => {
    if (!event || !event.type) return parts;
    switch (event.type) {
        case "thinking_delta":
            return upsertDelta(parts, { ...event, type: PART_TYPE.THINKING });
        case "text_delta":
            return upsertDelta(parts, { ...event, type: PART_TYPE.TEXT });
        case "tool_start":
            return startTool(parts, event);
        case "tool_result":
            return resultTool(parts, event);
        case "done":
            return parts.map((part) =>
                part.status === "running"
                    ? { ...part, status: "success", endedAt: Date.now() }
                    : part,
            );
        case "error": {
            const failed = failTool(parts, event.message);
            return failed.map((part) =>
                part.status === "running"
                    ? {
                          ...part,
                          status: "error",
                          error: event.message || "Stream error",
                          endedAt: Date.now(),
                      }
                    : part,
            );
        }
        default:
            return parts;
    }
};

/** Bấm Stop: mọi part còn running chuyển "stopped" (không giữ running). */
export const stopAllRunning = (parts) =>
    parts.map((part) =>
        part.status === "running" ? { ...part, status: "stopped", endedAt: Date.now() } : part,
    );

/**
 * Tin nhắn cũ từ BE chỉ có content phẳng → chuẩn hoá thành parts để 2 view
 * dùng chung một shape. Nội dung không suy diễn thêm (không bịa thinking).
 */
export const normalizeMessage = (message) => {
    if (!message) return message;

    // BE có thể trả parts dạng JSON string (forward-compatible); không parse lỗi thì bỏ qua.
    if (typeof message.parts === "string") {
        try {
            const parsed = JSON.parse(message.parts);
            if (Array.isArray(parsed) && parsed.length) {
                return { ...message, parts: parsed };
            }
        } catch {
            /* ignore malformed legacy payload */
        }
    }
    if (Array.isArray(message.parts) && message.parts.length) return message;

    const createdAt = message.createdAt ? Date.parse(message.createdAt) : null;
    const reasoning =
        message.reasoning ??
        message.reasoningContent ??
        message.thinking ??
        message.metadata?.reasoning ??
        message.metadata?.reasoningContent ??
        message.metadata?.thinking ??
        "";
    const reasoningText = typeof reasoning === "string" ? reasoning.trim() : "";

    const parts = [];
    if (reasoningText && message.role !== "USER") {
        parts.push({
            id: `${message.id}-thinking`,
            type: PART_TYPE.THINKING,
            status: "success",
            text: reasoningText,
            startedAt: createdAt,
            endedAt: createdAt,
        });
    }
    if (message.content) {
        parts.push({
            id: `${message.id}-text`,
            type: PART_TYPE.TEXT,
            status: "success",
            text: message.content,
        });
    }
    return { ...message, parts };
};

/** Part đầu tiên (đang chạy hoặc đã xong) quyết định trạng thái hub. */
export const runStatusOf = (parts = []) => {
    const running = parts.find((part) => part.status === "running");
    if (running) {
        if (running.type === PART_TYPE.THINKING) return "thinking";
        if (running.type === PART_TYPE.TOOL) return "tool";
        return "responding";
    }
    if (parts.some((part) => part.status === "error")) return "error";
    if (parts.some((part) => part.status === "stopped")) return "stopped";
    if (parts.length) return "done";
    return "idle";
};

export const isToolEdit = (part) =>
    Boolean(part?.meta?.diff) || /(^|_)(edit|write|patch|apply|replace)/i.test(part?.name || "");

/**
 * Diff theo dòng, dùng cho edit_file:
 *   meta.diff  = [{ op: "+"|"-" , text }]  (BE trả sẵn)
 *   meta.before/meta.after hoặc input.old/new = chuỗi → tự tính LCS đơn giản
 */
export const diffLines = (part) => {
    const meta = part?.meta || {};
    if (Array.isArray(meta.diff)) return meta.diff;

    const before = meta.before ?? meta.oldText ?? part?.input?.oldText ?? part?.input?.old ?? "";
    const after = meta.after ?? meta.newText ?? part?.input?.newText ?? part?.input?.new ?? "";
    if (!before && !after) return [];

    const a = String(before).split("\n");
    const b = String(after).split("\n");
    const m = a.length;
    const n = b.length;

    // LCS: bảng nhỏ là đủ (file chat thường ngắn); tránh O(mn) khi quá lớn
    if (m * n > 250000) {
        return [...a.map((text) => ({ op: "-", text })), ...b.map((text) => ({ op: "+", text }))];
    }

    const lcs = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i -= 1) {
        for (let j = n - 1; j >= 0; j -= 1) {
            lcs[i][j] =
                a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }

    const rows = [];
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
        if (a[i] === b[j]) {
            rows.push({ op: " ", text: a[i] });
            i += 1;
            j += 1;
        } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            rows.push({ op: "-", text: a[i] });
            i += 1;
        } else {
            rows.push({ op: "+", text: b[j] });
            j += 1;
        }
    }
    while (i < m) {
        rows.push({ op: "-", text: a[i] });
        i += 1;
    }
    while (j < n) {
        rows.push({ op: "+", text: b[j] });
        j += 1;
    }
    return rows;
};

/** Gom messages thành các "lượt" (user + assistant trả lời) cho Graph View. */
export const groupTurns = (messages = []) => {
    const turns = [];
    messages.forEach((message) => {
        if (message.role === "USER") {
            turns.push({ id: message.id, prompt: message.content || "", assistant: null });
            return;
        }
        const last = turns[turns.length - 1];
        if (last) last.assistant = message;
        else turns.push({ id: message.id, prompt: "", assistant: message });
    });
    return turns;
};

export { isTerminal };
