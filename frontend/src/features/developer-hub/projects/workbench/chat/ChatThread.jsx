import { useMemo, useRef, useState } from "react";
import { Send, Square, Sparkles } from "lucide-react";
import StreamView from "./StreamView.jsx";
import GraphView from "./GraphView.jsx";
import ViewToggle from "./ViewToggle.jsx";

const EMPTY = (
    <div className="agent-empty">
        <Sparkles size={22} />
        <strong>Ask the agent to change your code</strong>
        <span>It can read files, edit them and run tests — every step is visible.</span>
    </div>
);

const STATUS_TEXT = {
    idle: "Idle",
    thinking: "Thinking…",
    tool: "Running tool…",
    responding: "Responding…",
    done: "Done",
    stopped: "Stopped",
    error: "Error",
};

/**
 * ChatContainer — chỉ hiển thị, KHÔNG giữ kết nối stream.
 *
 * State duy nhất nằm ở `agent` (useAgentChat, đặt tại component cha), nên
 * chuyển Stream ⇄ Graph chỉ đổi cách render: không mất dữ liệu, không gọi lại API.
 *
 * @param {object}   props.agent      kết quả của useAgentChat
 * @param {ReactNode} props.composer  ô nhập dùng chung (tuỳ chọn). Không truyền
 *                                    thì dùng composer mặc định bên dưới.
 * @param {ReactNode} props.emptyState nội dung khi chưa có tin nhắn
 * @param {boolean}  props.showHeader hiện hàng header (status + ViewToggle)
 */
const ChatThread = ({ agent, composer = null, emptyState = EMPTY, showHeader = true, showTrace = true }) => {
    const { messages, run, isStreaming, view, setView, send, stop } = agent;

    const [draft, setDraft] = useState("");
    const inputRef = useRef(null);

    const statusLabel = useMemo(() => STATUS_TEXT[run.status] || "Idle", [run.status]);
    const canSend = draft.trim().length > 0 && !isStreaming;

    const submit = async () => {
        const text = draft.trim();
        if (!text || isStreaming) return;
        setDraft("");
        await send(text);
        inputRef.current?.focus();
    };

    const defaultComposer = (
        <div className="agent-composer">
            <div className="agent-composer-box">
                <textarea
                    ref={inputRef}
                    className="agent-prompt"
                    placeholder="Ask the agent to change your code…  (Enter to send, Shift+Enter for newline)"
                    value={draft}
                    rows={1}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                />
                {isStreaming ? (
                    <button type="button" className="agent-send stop" onClick={stop} title="Stop">
                        <Square size={12} />
                        <span>Stop</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        className="agent-send"
                        disabled={!canSend}
                        onClick={submit}
                        title="Send (Enter)"
                    >
                        <Send size={13} />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="agent-chat">
            {showHeader && (
                <div className="agent-chat-head">
                    <div className="agent-chat-head-left">
                        <span className={`agent-status-dot ${run.status}`} />
                        <strong>Agent</strong>
                        <span className="agent-status-text">{statusLabel}</span>
                    </div>
                    <ViewToggle view={view} onChange={setView} />
                </div>
            )}

            <div className="agent-chat-body">
                {view === "stream" ? (
                    <StreamView messages={messages} emptyState={emptyState} />
                ) : (
                    <GraphView
                        messages={messages}
                        runStatus={run.status}
                        emptyState={emptyState}
                        showTrace={showTrace}
                    />
                )}
            </div>

            {composer || defaultComposer}
        </div>
    );
};

export default ChatThread;
