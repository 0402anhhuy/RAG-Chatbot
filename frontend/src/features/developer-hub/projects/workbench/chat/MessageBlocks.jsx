// Các block hiển thị dùng chung cho Stream View và panel chi tiết của Agent Map.
import { useMemo, useState } from "react";
import {
    ChevronRight,
    Check,
    Copy,
    Loader2,
    XCircle,
    MinusCircle,
    Pencil,
    Terminal,
} from "lucide-react";
import ThinkingCard from "@/components/chat/ThinkingCard.jsx";
import { markdownToHtml } from "../helpers/markdown.js";
import { highlightCode } from "../helpers/syntax.js";
import { diffLines, isToolEdit, PART_TYPE } from "./chatParts.js";

/* ------------------------------------------------------------------ code */

const LANGUAGE_OF = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    sh: "shell",
    bash: "shell",
    yml: "yaml",
    html: "html",
    md: "markdown",
};

const normalizeLang = (raw) => {
    const lang = String(raw || "")
        .trim()
        .toLowerCase();
    if (!lang) return "plaintext";
    return LANGUAGE_OF[lang] || lang;
};

/** Tách markdown thành đoạn text và khối ``` để render riêng. */
const splitFences = (markdown = "") => {
    const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let buffer = [];

    const flushText = () => {
        if (buffer.length) {
            blocks.push({ kind: "text", value: buffer.join("\n") });
            buffer = [];
        }
    };

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line.startsWith("```")) {
            flushText();
            const lang = line.slice(3).trim();
            const code = [];
            i += 1;
            while (i < lines.length && !lines[i].startsWith("```")) {
                code.push(lines[i]);
                i += 1;
            }
            blocks.push({ kind: "code", lang: normalizeLang(lang), value: code.join("\n") });
            continue;
        }
        buffer.push(line);
    }
    flushText();
    return blocks;
};

export const CodeBlock = ({ code, language = "plaintext" }) => {
    const [copied, setCopied] = useState(false);
    const html = useMemo(() => highlightCode(code, normalizeLang(language)), [code, language]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
        } catch {
            /* clipboard bị chặn → im lặng, không phá UI */
        }
    };

    return (
        <div className="agent-code">
            <div className="agent-code-head">
                <span>{language || "text"}</span>
                <button type="button" onClick={copy} title="Copy code">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                </button>
            </div>
            <pre>
                <code dangerouslySetInnerHTML={{ __html: html }} />
            </pre>
        </div>
    );
};

/* ------------------------------------------------------------------ blocks */

/** Text (markdown) — code fence có highlight + Copy. */
export const TextBlock = ({ part }) => {
    const blocks = useMemo(() => splitFences(part.text || ""), [part.text]);

    return (
        <div className="agent-text-block">
            {blocks.map((block, index) =>
                block.kind === "code" ? (
                    <CodeBlock key={`code-${index}`} code={block.value} language={block.lang} />
                ) : (
                    <div
                        key={`text-${index}`}
                        className="agent-md"
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(block.value) }}
                    />
                ),
            )}
        </div>
    );
};

/** Thinking: thẻ VibeFlow — tự mở khi stream, thu gọn + "Show more" khi xong. */
export const ThinkingBlock = ({ part }) => (
    <ThinkingCard
        text={part.text || ""}
        status={part.status || "success"}
        startedAt={part.startedAt}
        endedAt={part.endedAt}
    />
);

const STATUS_ICON = {
    running: <Loader2 size={12} className="agent-spin" />,
    success: <Check size={12} />,
    error: <XCircle size={12} />,
    stopped: <MinusCircle size={12} />,
};

/** Diff theo dòng: "-" nền đỏ, "+" nền xanh. */
export const DiffView = ({ part }) => {
    const rows = useMemo(() => diffLines(part), [part]);
    if (!rows.length) return null;
    return (
        <div className="agent-diff">
            {rows.map((row, index) => (
                <div
                    key={index}
                    className={`agent-diff-row ${
                        row.op === "-" ? "del" : row.op === "+" ? "add" : "ctx"
                    }`}
                >
                    <span className="agent-diff-sign">{row.op === " " ? "" : row.op}</span>
                    <span className="agent-diff-text">{row.text}</span>
                </div>
            ))}
        </div>
    );
};

const shortPath = (path) => {
    if (!path) return "";
    const parts = String(path).split("/");
    return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : path;
};

/** Tool block: dark, viền tím, header monospace, body scroll. */
export const ToolBlock = ({ part }) => {
    const edit = isToolEdit(part);
    const hasDiff = edit && diffLines(part).length > 0;
    const [open, setOpen] = useState(hasDiff); // edit file mặc định mở
    const path = part.input?.path || part.input?.file || part.input?.command || "";

    return (
        <div className={`agent-tool status-${part.status} ${edit ? "is-edit" : ""}`}>
            <button
                type="button"
                className="agent-tool-head"
                onClick={() => setOpen((prev) => !prev)}
            >
                <ChevronRight size={11} className={`agent-caret ${open ? "open" : ""}`} />
                <span className="agent-tool-title">
                    {edit ? <Pencil size={11} /> : <Terminal size={11} />}
                    {part.name}
                    {path ? ` · ${shortPath(path)}` : ""}
                </span>
                <span className="agent-tool-status">{STATUS_ICON[part.status] || null}</span>
            </button>

            {open && (
                <div className="agent-tool-body">
                    {part.input && Object.keys(part.input).length > 0 && (
                        <div className="agent-tool-input">
                            <span className="agent-tool-label">input</span>
                            <pre>{JSON.stringify(part.input, null, 2)}</pre>
                        </div>
                    )}
                    {hasDiff ? (
                        <DiffView part={part} />
                    ) : (
                        part.output && (
                            <div className="agent-tool-output">
                                <span className="agent-tool-label">output</span>
                                <pre>{part.output}</pre>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export const PartBlock = ({ part }) => {
    if (part.type === PART_TYPE.THINKING) return <ThinkingBlock part={part} />;
    if (part.type === PART_TYPE.TOOL) return <ToolBlock part={part} />;
    return <TextBlock part={part} />;
};

/** Một message của assistant: các part xen kẽ đúng thứ tự. */
export const AssistantMessage = ({ message }) => (
    <div className="agent-message assistant">
        {message.parts.map((part) => (
            <PartBlock key={part.id} part={part} />
        ))}
    </div>
);
