// Mock transport cho agent stream. Cùng shape event với SSE thật:
//   thinking_delta / text_delta / tool_start / tool_result / done / error
//
// Vì sao mock: backend hiện chỉ có POST /chat/sessions/{id}/messages trả về
// message phẳng, CHƯA có endpoint SSE. Khi BE có, chỉ cần thay `startMockStream`
// bằng `startSseStream` (fetch + ReadableStream) — phần còn lại không đổi.

const wait = (ms, signal) =>
    new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });

const chunk = (text, size = 6) => {
    const out = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
};

/**
 * Kịch bản mock. `id` của mỗi part ổn định để delta nối đúng chỗ.
 * "big" sinh > 8 node để kiểm tra vòng ngoài của Graph.
 */
const SCENARIOS = {
    default: [
        {
            type: "thinking",
            id: "t1",
            text: "Người dùng muốn tôi xem cấu trúc project trước khi sửa. Tôi nên đọc package.json và tìm component liên quan.",
        },
        {
            type: "text",
            id: "a1",
            text: "Mình sẽ kiểm tra cấu trúc project trước nhé.\n\nĐang đọc `package.json` để biết stack.",
        },
        {
            type: "tool",
            id: "r1",
            name: "read_file",
            input: { path: "frontend/package.json" },
            output: '{\n  "name": "rag-chatbot-frontend",\n  "private": true,\n  "type": "module",\n  "dependencies": {\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0",\n    "lucide-react": "^0.400.0"\n  }\n}',
        },
        {
            type: "thinking",
            id: "t2",
            text: "Stack là React 19 + Vite. Component chat nằm trong WorkbenchWorkspace. Giờ mình sửa file CSS để thêm layout.",
        },
        {
            type: "tool",
            id: "e1",
            name: "edit_file",
            input: {
                path: "frontend/src/features/developer-hub/projects/workbench/WorkbenchWorkspace.css",
            },
            before: "/* 1. IDE 3 CỘT */\n.workbench-three-col-layout {\n    display: grid;\n}",
            after: "/* 1. IDE 3 CỘT */\n.workbench-three-col-layout {\n    display: grid;\n    gap: 0;\n}",
        },
        {
            type: "text",
            id: "a2",
            text: "Xong. Mình đã thêm `gap: 0` cho layout 3 cột.\n\n```css\n.workbench-three-col-layout {\n    display: grid;\n    gap: 0;\n}\n```\n\nBạn muốn mình chỉnh tiếp phần nào?",
        },
    ],
    error: [
        { type: "thinking", id: "t1", text: "Cần chạy test để xác nhận thay đổi." },
        {
            type: "tool",
            id: "r1",
            name: "read_file",
            input: { path: "backend/src/main/java/App.java" },
            output: "public class App { }",
        },
        {
            type: "tool",
            id: "x1",
            name: "run_tests",
            input: { command: "mvn -q test" },
            error: "Command failed with exit code 1: tests failed (3 failures)",
        },
        { type: "text", id: "a1", text: "Mình đã chạy test nhưng thất bại, cần xem log chi tiết." },
        { type: "error", message: "Agent stopped: tool 'run_tests' failed after 3 retries." },
    ],
    big: [
        { type: "thinking", id: "t1", text: "Bắt đầu khảo sát repo." },
        {
            type: "tool",
            id: "r1",
            name: "read_file",
            input: { path: "README.md" },
            output: "# RAG Chatbot\n",
        },
        { type: "thinking", id: "t2", text: "README ít thông tin, đọc thêm cấu trúc." },
        {
            type: "tool",
            id: "r2",
            name: "list_dir",
            input: { path: "frontend/src" },
            output: "api/\nfeatures/\ncomponents/\n",
        },
        {
            type: "tool",
            id: "r3",
            name: "grep",
            input: { pattern: "WorkbenchWorkspace" },
            output: "3 matches in 2 files",
        },
        { type: "text", id: "a1", text: "Đã nắm cấu trúc chính." },
        {
            type: "tool",
            id: "e1",
            name: "edit_file",
            input: { path: "frontend/src/App.jsx" },
            before: "const a = 1;",
            after: "const a = 2;",
        },
        {
            type: "tool",
            id: "e2",
            name: "edit_file",
            input: { path: "frontend/src/main.jsx" },
            before: "render(<App />);",
            after: "render(<App strict />);",
        },
        { type: "thinking", id: "t3", text: "Cần cập nhật thêm test." },
        {
            type: "tool",
            id: "e3",
            name: "edit_file",
            input: { path: "frontend/src/App.test.jsx" },
            before: "expect(1).toBe(1);",
            after: "expect(2).toBe(2);",
        },
        { type: "text", id: "a2", text: "Đã cập nhật 3 file." },
        {
            type: "tool",
            id: "x1",
            name: "run_tests",
            input: { command: "npm test" },
            output: "All 12 tests passed.",
        },
        { type: "text", id: "a3", text: "Tất cả test đều pass. Hoàn tất." },
    ],
};

/**
 * Phát event theo timeline. Trả về hàm abort.
 *
 * @param {object}   opts
 * @param {string}   opts.scenario   default | error | big
 * @param {boolean}  opts.supportsReasoning  false → bỏ hẳn part thinking (không bịa)
 * @param {boolean}  opts.streaming  false → backend cắt nhỏ rồi gửi cùng format
 * @param {(e:object)=>void} opts.onEvent
 * @param {(err:Error)=>void} opts.onError
 * @param {()=>void} opts.onDone
 */
export const startMockStream = ({
    scenario = "default",
    supportsReasoning = true,
    streaming = true,
    onEvent,
    onError,
    onDone,
}) => {
    const controller = new AbortController();
    const { signal } = controller;
    const plan = SCENARIOS[scenario] || SCENARIOS.default;

    const emitText = async (partId, type, text) => {
        // Model không stream: gửi một lần duy nhất, cùng format event.
        const pieces = streaming ? chunk(text, 8) : [text];
        for (const piece of pieces) {
            await wait(streaming ? 28 : 0, signal);
            onEvent({ type: `${type}_delta`, id: partId, text: piece });
        }
    };

    (async () => {
        try {
            for (const step of plan) {
                if (signal.aborted) throw new DOMException("Aborted", "AbortError");

                if (step.type === "thinking") {
                    if (!supportsReasoning) continue; // không có reasoning → không hiện
                    await wait(140, signal);
                    await emitText(step.id, "thinking", step.text);
                    continue;
                }
                if (step.type === "text") {
                    await wait(90, signal);
                    await emitText(step.id, "text", step.text);
                    continue;
                }
                if (step.type === "tool") {
                    await wait(160, signal);
                    onEvent({
                        type: "tool_start",
                        id: step.id,
                        name: step.name,
                        input: step.input,
                    });
                    await wait(step.error ? 320 : 460, signal);
                    onEvent({
                        type: "tool_result",
                        id: step.id,
                        status: step.error ? "error" : "success",
                        output: step.error || step.output || "",
                        meta: step.error
                            ? null
                            : step.before
                              ? { before: step.before, after: step.after }
                              : null,
                    });
                    continue;
                }
                if (step.type === "error") {
                    await wait(200, signal);
                    onEvent({ type: "error", message: step.message });
                    return;
                }
            }
            await wait(120, signal);
            onEvent({ type: "done" });
            onDone?.();
        } catch (err) {
            if (err?.name === "AbortError") return;
            onError?.(err);
        }
    })();

    return () => controller.abort();
};

export const MOCK_SCENARIOS = Object.keys(SCENARIOS);
