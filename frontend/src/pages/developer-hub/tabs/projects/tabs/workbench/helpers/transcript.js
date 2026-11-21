// Tạo transcript markdown phía client. BE cũng có endpoint tương đương, nhưng
// khi conversation chưa được lưu (chưa gửi tin nào) thì client tự dựng từ state
// đang hiển thị để nút "Download transcript" không bị chết.

const formatTime = (value) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
};

export const buildTranscriptMarkdown = ({ projectName, title, messages = [] }) => {
    const lines = [`# ${projectName || "Project"} — ${title || "Transcript"}`, ""];

    if (!messages.length) {
        lines.push("_No messages in this conversation yet._");
        return lines.join("\n");
    }

    messages.forEach((message) => {
        lines.push(
            `**${(message.role || "ASSISTANT").toUpperCase()}** ${formatTime(message.createdAt)}`,
        );
        lines.push("");
        lines.push(message.content || "");
        lines.push("");
        lines.push("---");
        lines.push("");
    });

    return lines.join("\n");
};

export const downloadTextFile = (filename, content, mime = "text/markdown;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
