// Render markdown (README, docs...) thành HTML để xem ở tab Preview.
// An toàn: escape toàn bộ HTML trước khi áp dụng cú pháp markdown, nên
// nội dung file không thể chèn thẻ/script vào trang.

const escapeHtml = (text) =>
    text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const renderInline = (text) =>
    text
        // `code`
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        // images ![alt](src) — chỉ http(s)/data
        .replace(
            /!\[([^\]]*)\]\((https?:\/\/[^)\s]+|data:image\/[^)\s]+)\)/g,
            '<img alt="$1" src="$2" />',
        )
        // links [text](url) — chỉ http(s)
        .replace(
            /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
            '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>',
        )
        // bold + italic
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

const renderBlocks = (lines) => {
    const html = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Fenced code block
        if (line.startsWith("```")) {
            const code = [];
            i += 1;
            while (i < lines.length && !lines[i].startsWith("```")) {
                code.push(lines[i]);
                i += 1;
            }
            i += 1;
            html.push(`<pre><code>${code.join("\n")}</code></pre>`);
            continue;
        }

        // Heading
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length;
            html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
            i += 1;
            continue;
        }

        // Horizontal rule
        if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) {
            html.push("<hr />");
            i += 1;
            continue;
        }

        // Blockquote
        if (line.startsWith(">")) {
            const quote = [];
            while (i < lines.length && lines[i].startsWith(">")) {
                quote.push(lines[i].replace(/^>\s?/, ""));
                i += 1;
            }
            html.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`);
            continue;
        }

        // Lists (ul / ol)
        const ulMatch = line.match(/^\s*[-*+]\s+/);
        const olMatch = line.match(/^\s*\d+[.)]\s+/);
        if (ulMatch || olMatch) {
            const tag = ulMatch ? "ul" : "ol";
            const items = [];
            const pattern = ulMatch ? /^\s*[-*+]\s+/ : /^\s*\d+[.)]\s+/;
            while (i < lines.length && pattern.test(lines[i])) {
                items.push(`<li>${renderInline(lines[i].replace(pattern, ""))}</li>`);
                i += 1;
            }
            html.push(`<${tag}>${items.join("")}</${tag}>`);
            continue;
        }

        // Bỏ qua dòng trống
        if (!line.trim()) {
            i += 1;
            continue;
        }

        // Đoạn văn: gom các dòng liên tiếp
        const paragraph = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i])
        ) {
            paragraph.push(lines[i]);
            i += 1;
        }
        html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    }

    return html.join("");
};

export const markdownToHtml = (markdown = "") =>
    renderBlocks(escapeHtml(markdown.replace(/\r\n/g, "\n")).split("\n"));
