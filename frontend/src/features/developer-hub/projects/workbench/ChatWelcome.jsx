import { Sparkles } from "lucide-react";
import { CHAT_SLASH_HINTS, CHAT_SUGGESTIONS } from "./config/chat.js";

/** Khung chào khi conversation chưa có tin nhắn (dùng cho cả tab IDE & Chat). */
const ChatWelcome = ({ userName, onPick, disabled = false }) => (
    <div className="wb-chat-welcome">
        <div className="wb-welcome-orb" aria-hidden="true">
            <Sparkles size={22} />
        </div>
        <h3>Hey {userName}, what to build today?</h3>
        <p>I can write code, debug issues, explain architecture, and more.</p>

        <div className="wb-suggest-grid">
            {CHAT_SUGGESTIONS.map(({ id, icon: Icon, title, desc, prompt }) => (
                <button
                    key={id}
                    type="button"
                    className="wb-suggest-card"
                    onClick={() => onPick(prompt)}
                    disabled={disabled}
                >
                    <span className="wb-suggest-icon">
                        <Icon size={15} />
                    </span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                </button>
            ))}
        </div>

        <div className="wb-slash-hint-row">
            {CHAT_SLASH_HINTS.map((hint) => (
                <span key={hint.key}>
                    <kbd>{hint.key}</kbd>
                    {hint.label}
                </span>
            ))}
        </div>
    </div>
);

export default ChatWelcome;
