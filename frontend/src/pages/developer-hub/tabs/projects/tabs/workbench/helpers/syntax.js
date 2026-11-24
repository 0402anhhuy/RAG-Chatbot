// Syntax highlighter nhẹ cho editor Workbench — regex scanner, KHÔNG thêm
// dependency. Bảo mật: mỗi segment đều được escape HTML trước khi bọc <span>,
// nên nội dung file không thể chèn markup vào trang.

const escapeHtml = (text) =>
    text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const span = (cls, text) => (cls ? `<span class="${cls}">${escapeHtml(text)}</span>` : escapeHtml(text));

// Từ khoá theo họ ngôn ngữ
const KEYWORDS = {
    clike:
        "break case catch class const continue default delete do else enum export extends " +
        "false finally for function if implements import in instanceof interface let new null " +
        "package private protected public return static super switch this throw true try typeof " +
        "var void while yield async await of from as abstract final native synchronized transient " +
        "volatile byte short int long float double char boolean throws assert strict",
    python:
        "and as assert async await break class continue def del elif else except False finally " +
        "for from global if import in is lambda None nonlocal not or pass raise return True try " +
        "while with yield self",
    sql:
        "select from where insert into values update set delete create table alter drop add " +
        "primary key foreign references join left right inner outer on group by order having " +
        "limit offset as and or not null distinct union all index view exists between like in is",
    shell:
        "if then else elif fi for while do done case esac function return in echo cd export " +
        "source local read exit set unset shift",
    yaml:
        "true false null yes no on off",
};

/**
 * Scanner "C-like": comment (//, /* *\/), string ('' "" ``), number, keyword,
 * Class, function-call, identifier. Trả về HTML đã escape.
 */
const highlightCLike = (code, keywordSet) => {
    const pattern = new RegExp(
        [
            "(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)", // 1 comment
            "(`(?:\\\\.|[^`\\\\])*`|\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*')", // 2 string
            "(\\b0[xXbBoO][\\da-fA-F_]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)", // 3 number
            "(\\b[A-Za-z_$][\\w$]*\\b)", // 4 word
        ].join("|"),
        "g",
    );
    const keywords = new Set(keywordSet.split(/\s+/));

    let html = "";
    let last = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        html += escapeHtml(code.slice(last, match.index));
        last = match.index + match[0].length;

        if (match[1]) {
            html += span("syn-comment", match[1]);
        } else if (match[2]) {
            html += span("syn-string", match[2]);
        } else if (match[3]) {
            html += span("syn-number", match[3]);
        } else if (match[4]) {
            const word = match[4];
            const after = code.slice(last).match(/^\s*\(/);
            if (keywords.has(word)) {
                html += span("syn-keyword", word);
            } else if (after) {
                html += span("syn-func", word);
            } else if (/^[A-Z]/.test(word)) {
                html += span("syn-tag", word);
            } else {
                html += escapeHtml(word);
            }
        }
    }
    html += escapeHtml(code.slice(last));
    return html;
};

const highlightPython = (code) => {
    const pattern = new RegExp(
        [
            "(#[^\\n]*)", // 1 comment
            "([rbf]{0,2}\"\"\"[\\s\\S]*?\"\"\"|[rbf]{0,2}'''[\\s\\S]*?'''|[rbf]{0,2}\"(?:\\\\.|[^\"\\\\\\n])*\"|[rbf]{0,2}'(?:\\\\.|[^'\\\\\\n])*')", // 2 string
            "(\\b\\d[\\d_]*(?:\\.\\d+)?\\b)", // 3 number
            "([A-Za-z_][\\w]*)", // 4 word
        ].join("|"),
        "g",
    );
    const keywords = new Set(KEYWORDS.python.split(/\s+/));

    let html = "";
    let last = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        html += escapeHtml(code.slice(last, match.index));
        last = match.index + match[0].length;

        if (match[1]) {
            html += span("syn-comment", match[1]);
        } else if (match[2]) {
            html += span("syn-string", match[2]);
        } else if (match[3]) {
            html += span("syn-number", match[3]);
        } else if (match[4]) {
            const word = match[4];
            const before = code.slice(Math.max(0, match.index - 8), match.index);
            if (keywords.has(word)) {
                html += span("syn-keyword", word);
            } else if (/\b(def|class)\s+$/.test(before)) {
                html += span("syn-func", word);
            } else {
                html += escapeHtml(word);
            }
        }
    }
    html += escapeHtml(code.slice(last));
    return html;
};

const highlightCss = (code) => {
    const pattern = new RegExp(
        [
            "(\\/\\*[\\s\\S]*?\\*\\/)", // 1 comment
            "([.#][A-Za-z_-][\\w-]*|&:[a-z-]+|:{1,2}[a-z-]+)", // 2 selector fragment
            "([A-Za-z-]+(?=\\s*:))", // 3 property
            "(\"[^\"]*\"|'[^']*')", // 4 string
            "(#[0-9a-fA-F]{3,8}\\b|\\b\\d[\\d.]*(?:px|rem|em|%|vh|vw|s|ms|fr|deg)?\\b)", // 5 number/color
            "(@[a-z-]+)", // 6 at-rule
        ].join("|"),
        "g",
    );

    let html = "";
    let last = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        html += escapeHtml(code.slice(last, match.index));
        last = match.index + match[0].length;

        if (match[1]) html += span("syn-comment", match[1]);
        else if (match[2]) html += span("syn-tag", match[2]);
        else if (match[3]) html += span("syn-attr", match[3]);
        else if (match[4]) html += span("syn-string", match[4]);
        else if (match[5]) html += span("syn-number", match[5]);
        else if (match[6]) html += span("syn-keyword", match[6]);
    }
    html += escapeHtml(code.slice(last));
    return html;
};

const highlightJson = (code) => {
    const pattern = new RegExp(
        [
            "(\"(?:\\\\.|[^\"\\\\])*\")(\\s*:)?", // 1 string, 2 optional colon → key
            "(-?\\b\\d[\\d.eE+-]*\\b)", // 3 number
            "\\b(true|false|null)\\b", // 4 literal
        ].join("|"),
        "g",
    );

    let html = "";
    let last = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        html += escapeHtml(code.slice(last, match.index));
        last = match.index + match[0].length;

        if (match[1] && match[2]) html += span("syn-attr", match[1]) + escapeHtml(match[2]);
        else if (match[1]) html += span("syn-string", match[1]);
        else if (match[3]) html += span("syn-number", match[3]);
        else if (match[4]) html += span("syn-keyword", match[4]);
    }
    html += escapeHtml(code.slice(last));
    return html;
};

const highlightMarkdown = (code) => {
    const escape = /(^`[^`\n]*`)|(^#{1,6} )|(^> )|(^\s*[-*+] )|(^\s*\d+\. )/gm;
    let html = "";
    let last = 0;
    let match;
    while ((match = escape.exec(code)) !== null) {
        html += escapeHtml(code.slice(last, match.index));
        last = escape.lastIndex;
        if (match[1]) html += span("syn-string", match[1]);
        else if (match[2]) html += span("syn-keyword", match[2]);
        else if (match[3]) html += span("syn-comment", match[3]);
        else html += span("syn-tag", match[0]);
    }
    html += escapeHtml(code.slice(last));
    return html;
};

const highlightMarkup = (code) => {
    const pattern = new RegExp(
        [
            "(<!--[\\s\\S]*?-->)", // 1 comment
            "(<\\/?[A-Za-z][\\w:-]*)", // 2 tag open/close
            "([A-Za-z-]+)(=)", // 3 attr, 4 =
            "(\"[^\"]*\"|'[^']*')", // 5 string
        ].join("|"),
        "g",
    );

    let html = "";
    let last = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        html += escapeHtml(code.slice(last, match.index));
        last = match.index + match[0].length;

        if (match[1]) html += span("syn-comment", match[1]);
        else if (match[2]) html += span("syn-keyword", match[2]);
        else if (match[3]) html += span("syn-attr", match[3]) + escapeHtml(match[4]);
        else if (match[5]) html += span("syn-string", match[5]);
    }
    html += escapeHtml(code.slice(last));
    return html;
};

const highlightKeyValue = (code, commentToken) => {
    const pattern = new RegExp(
        [
            `(${commentToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n]*)`, // 1 comment
            "(^\\s*[A-Za-z_][\\w.-]*)(\\s*[:=])", // 2 key, 3 separator
            "(\"[^\"]*\"|'[^']*')", // 4 string
            "(\\b\\d[\\d.]*\\b)", // 5 number
        ].join("|"),
        "gm",
    );

    let html = "";
    let last = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        html += escapeHtml(code.slice(last, match.index));
        last = match.index + match[0].length;

        if (match[1]) html += span("syn-comment", match[1]);
        else if (match[2]) html += span("syn-attr", match[2]) + escapeHtml(match[3]);
        else if (match[4]) html += span("syn-string", match[4]);
        else if (match[5]) html += span("syn-number", match[5]);
    }
    html += escapeHtml(code.slice(last));
    return html;
};

const HIGHLIGHTERS = {
    clike: (code) => highlightCLike(code, KEYWORDS.clike),
    python: highlightPython,
    css: highlightCss,
    json: highlightJson,
    markdown: highlightMarkdown,
    markup: highlightMarkup,
    sql: (code) => highlightCLike(code, KEYWORDS.sql),
    shell: (code) => highlightKeyValue(code, "#"),
    yaml: (code) => highlightKeyValue(code, "#"),
    properties: (code) => highlightKeyValue(code, "#"),
};

const LANGUAGE_KIND = {
    javascript: "clike",
    typescript: "clike",
    java: "clike",
    sql: "sql",
    python: "python",
    css: "css",
    json: "json",
    markdown: "markdown",
    html: "markup",
    xml: "markup",
    yaml: "yaml",
    shell: "shell",
    properties: "properties",
};

/**
 * Trả về HTML đã escape + bọc span theo cú pháp. Ngôn ngữ chưa hỗ trợ
 * (plaintext...) chỉ escape thuần.
 */
export const highlightCode = (code, language = "plaintext") => {
    const highlighter = HIGHLIGHTERS[LANGUAGE_KIND[language]];
    return highlighter ? highlighter(code) : escapeHtml(code);
};
