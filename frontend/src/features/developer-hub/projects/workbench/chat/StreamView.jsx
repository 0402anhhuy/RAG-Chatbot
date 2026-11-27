import { useEffect, useRef } from "react";
import { AssistantMessage, TextBlock } from "./MessageBlocks.jsx";

const BOTTOM_THRESHOLD = 64;

/**
 * Stream View: text (markdown), thinking và tool block xen kẽ đúng thứ tự.
 * Tự cuộn xuống khi có nội dung mới, nhưng DỪNG nếu người dùng đã cuộn lên.
 */
const StreamView = ({ messages, emptyState = null }) => {
    const scrollRef = useRef(null);
    const stickToBottom = useRef(true);
    const hasContent = messages.length > 0;

    const onScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottom.current = distance < BOTTOM_THRESHOLD;
    };

    // Cuộn theo nội dung mới (kể cả delta) — chỉ khi người dùng đang ở đáy
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !stickToBottom.current) return;
        el.scrollTop = el.scrollHeight;
    }, [messages]);

    return (
        <div className="agent-stream-scroll" ref={scrollRef} onScroll={onScroll}>
            {!hasContent && emptyState}

            {messages.map((message) =>
                message.role === "USER" ? (
                    <div key={message.id} className="agent-message user">
                        <div className="agent-user-bubble">
                            <TextBlock part={{ text: message.content || "" }} />
                        </div>
                    </div>
                ) : (
                    <AssistantMessage key={message.id} message={message} />
                ),
            )}
        </div>
    );
};

export default StreamView;
