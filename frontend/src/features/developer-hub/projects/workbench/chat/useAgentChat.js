import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyEvent, normalizeMessage, stopAllRunning, runStatusOf } from "./chatParts.js";
import { startMockStream } from "./mockAgentStream.js";

const VIEW_KEY = "wb.agentChat.view";
const VIEWS = ["stream", "graph"];

export const readSavedView = () => {
    try {
        const saved = localStorage.getItem(VIEW_KEY);
        return VIEWS.includes(saved) ? saved : "stream";
    } catch {
        return "stream";
    }
};

const saveView = (view) => {
    try {
        localStorage.setItem(VIEW_KEY, view);
    } catch {
        /* localStorage bị chặn → chỉ mất tuỳ chọn, không ảnh hưởng chat */
    }
};

const makeId = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * useAgentChat — NGUỒN STATE DUY NHẤT của chat agent.
 *
 * Chỉ hook này giữ kết nối stream; StreamView và GraphView chỉ đọc `messages`
 * và `run`. Đổi view = đổi cách render, không đụng dữ liệu, không gọi lại API.
 *
 * @param {object}   opts
 * @param {string}   opts.sessionId   conversation id (null = chưa có)
 * @param {Array}    opts.initialMessages  tin nhắn cũ từ BE (content phẳng)
 * @param {boolean}  opts.supportsReasoning  model có trả reasoning hay không
 * @param {string}   opts.scenario   kịch bản mock (default | error | big)
 * @param {boolean}  opts.mock       true = dùng mock thay cho mạng
 */
export const useAgentChat = ({
    sessionId = null,
    initialMessages = [],
    supportsReasoning = true,
    scenario = "default",
    mock = true,
} = {}) => {
    const [messages, setMessages] = useState(() => initialMessages.map(normalizeMessage));
    const [run, setRun] = useState({ id: null, status: "idle" });
    const [view, setViewState] = useState(readSavedView);

    const abortRef = useRef(null);
    const runIdRef = useRef(null);

    const setView = useCallback((next) => {
        setViewState((prev) => {
            if (prev === next) return prev;
            saveView(next);
            return next;
        });
    }, []);

    // Đổi conversation → nạp lại tin nhắn cũ, huỷ stream đang chạy
    useEffect(() => {
        abortRef.current?.();
        abortRef.current = null;
        runIdRef.current = null;
        setMessages(initialMessages.map(normalizeMessage));
        setRun({ id: null, status: "idle" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const stop = useCallback(() => {
        abortRef.current?.();
        abortRef.current = null;
        const runId = runIdRef.current;
        if (runId) {
            setMessages((prev) =>
                prev.map((message) =>
                    message.id === runId
                        ? { ...message, parts: stopAllRunning(message.parts) }
                        : message,
                ),
            );
        }
        setRun((prev) => (prev.id ? { ...prev, status: "stopped" } : prev));
    }, []);

    const send = useCallback(
        async (content) => {
            const text = String(content || "").trim();
            if (!text) return null;

            // Gửi khi đang chạy → chốt lượt cũ trước, không bỏ dữ liệu
            if (abortRef.current) stop();

            const userId = makeId("u");
            const runId = makeId("a");
            runIdRef.current = runId;

            setMessages((prev) => [
                ...prev,
                {
                    id: userId,
                    role: "USER",
                    content: text,
                    createdAt: new Date().toISOString(),
                    parts: [
                        {
                            id: `${userId}-text`,
                            type: "text",
                            status: "success",
                            text,
                        },
                    ],
                },
                {
                    id: runId,
                    role: "ASSISTANT",
                    content: "",
                    createdAt: new Date().toISOString(),
                    parts: [],
                },
            ]);
            setRun({ id: runId, status: "thinking" });

            const pushEvent = (event) => {
                setMessages((prev) =>
                    prev.map((message) =>
                        message.id === runId
                            ? { ...message, parts: applyEvent(message.parts, event) }
                            : message,
                    ),
                );
                setRun((prev) => {
                    if (prev.id !== runId) return prev;
                    if (event.type === "error") return { ...prev, status: "error" };
                    if (event.type === "done") return { ...prev, status: "done" };
                    return prev;
                });
            };

            if (!mock) {
                // Khi BE có SSE: thay bằng startSseStream(sessionId, text, ...)
                pushEvent({
                    type: "error",
                    message: "Streaming API chưa sẵn sàng. Đang dùng mock.",
                });
                return runId;
            }

            abortRef.current = startMockStream({
                scenario,
                supportsReasoning,
                onEvent: pushEvent,
                onError: (err) =>
                    pushEvent({ type: "error", message: err?.message || "Stream error" }),
                onDone: () => {
                    abortRef.current = null;
                },
            });
            return runId;
        },
        [mock, scenario, stop, supportsReasoning],
    );

    // Unmount: huỷ stream, không setState sau khi đã gỡ
    useEffect(() => () => abortRef.current?.(), []);

    const lastRunStatus = useMemo(() => {
        if (run.id) return run.status;
        return "idle";
    }, [run]);

    const activeAssistant = useMemo(
        () => (run.id ? messages.find((message) => message.id === run.id) || null : null),
        [messages, run.id],
    );

    // Trạng thái hub: suy trực tiếp từ parts của lượt đang chạy (nguồn duy nhất).
    // run.status chỉ bổ sung cho error/stopped — không có part nào bị kẹt running.
    const derivedStatus = useMemo(() => {
        if (!run.id) return lastRunStatus;
        const fromParts = activeAssistant ? runStatusOf(activeAssistant.parts) : "idle";
        if (run.status === "stopped") return "stopped";
        if (fromParts === "error") return "error";
        return fromParts === "idle" ? "thinking" : fromParts;
    }, [activeAssistant, lastRunStatus, run.id, run.status]);

    const isStreaming =
        Boolean(run.id) && !["done", "error", "stopped"].includes(derivedStatus);

    return {
        messages,
        run: { ...run, status: derivedStatus },
        isStreaming,
        view,
        setView,
        send,
        stop,
    };
};

export default useAgentChat;
