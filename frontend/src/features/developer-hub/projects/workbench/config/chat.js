import {
    Bot,
    Bug,
    Code2,
    Cpu,
    FileText,
    GitBranch,
    Layers,
    PanelsTopLeft,
    RotateCcw,
    Search,
    Server,
    Sparkles,
    TestTube,
} from "lucide-react";

/** Bộ lọc conversation trong panel chat. */
export const CONVO_FILTERS = [
    { value: "ACTIVE", label: "Active" },
    { value: "ARCHIVED", label: "Archived" },
    { value: "ALL", label: "All" },
];

/** Gợi ý mở đầu cho khung chat (2x2 như ảnh mẫu). */
export const CHAT_SUGGESTIONS = [
    {
        id: "explain",
        icon: Code2,
        title: "Explain codebase",
        desc: "Understand the project structure",
        prompt: "Explain the architecture of this project.",
    },
    {
        id: "bugs",
        icon: Bug,
        title: "Find bugs",
        desc: "Scan for issues and vulnerabilities",
        prompt: "Scan this project for bugs and security issues.",
    },
    {
        id: "tests",
        icon: TestTube,
        title: "Write tests",
        desc: "Cover the riskiest paths first",
        prompt: "Write tests for the most important modules in this project.",
    },
    {
        id: "feature",
        icon: Sparkles,
        title: "Plan a feature",
        desc: "Turn an idea into a task list",
        prompt: "Help me plan a new feature end to end: ",
    },
];

/** Nhãn gợi ý cú pháp dưới ô prompt. */
export const CHAT_SLASH_HINTS = [
    { key: "!", label: "agents" },
    { key: "/", label: "skills" },
    { key: "#", label: "workflows" },
    { key: "@", label: "files" },
    { key: "↑", label: "history" },
    { key: "?", label: "help" },
];

/** Icon cho item ở Canvas (workflow/agent đều có iconKey từ BE). */
const CANVAS_ICON_MAP = {
    bot: Bot,
    cpu: Cpu,
    server: Server,
    code: Code2,
    file: FileText,
    fileplus: FileText,
    "file-plus": FileText,
    search: Search,
    db: Layers,
    cloud: Layers,
    shield: Layers,
    network: GitBranch,
    git: GitBranch,
    refresh: RotateCcw,
    terminal: Code2,
    palette: Sparkles,
    monitor: PanelsTopLeft,
    layers: Layers,
};

export const canvasIconFor = (item) =>
    CANVAS_ICON_MAP[item?.iconKey] || (item?.kind === "agent" ? Cpu : Layers);

/** Cấu hình cho picker mở ra từ nút "+". */
export const PICKER_CONFIG = {
    agent: {
        title: "Filter agents…",
        hint: "TYPE TO FILTER · ↑↓ NAVIGATE · ENTER PICK · ESC CLOSE",
        empty: "No agents match that filter.",
        badge: "agent",
    },
    skill: {
        title: "Filter skills…",
        hint: "TYPE TO FILTER · ↑↓ NAVIGATE · ENTER PICK · ESC CLOSE",
        empty: "No skills match that filter.",
        badge: "skill",
    },
    workflow: {
        title: "Filter workflows…",
        hint: "TYPE TO FILTER · ↑↓ NAVIGATE · ENTER PICK · ESC CLOSE",
        empty: "No workflows match that filter.",
        badge: "workflow",
    },
};
