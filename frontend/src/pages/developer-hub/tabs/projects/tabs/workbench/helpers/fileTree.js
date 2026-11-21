// Dựng cây thư mục từ danh sách file phẳng của BE.
// BE chỉ lưu path ("src/main/App.java"), nên folder được suy ra từ path để
// không phải thêm bảng và không bị lệch khi rename.

const byName = (a, b) => a.name.localeCompare(b.name);

const insertPath = (root, file) => {
    const segments = file.path.split("/");
    let node = root;

    segments.forEach((segment, index) => {
        const isLeaf = index === segments.length - 1;
        if (isLeaf) {
            node.children.push({
                kind: "file",
                id: file.id,
                name: file.name || segment,
                path: file.path,
                extension: file.extension,
                language: file.language,
                sizeBytes: file.sizeBytes,
                lineCount: file.lineCount,
            });
            return;
        }

        let folder = node.children.find(
            (child) => child.kind === "folder" && child.name === segment,
        );
        if (!folder) {
            const path = segments.slice(0, index + 1).join("/");
            folder = {
                kind: "folder",
                name: segment,
                path,
                children: [],
            };
            node.children.push(folder);
        }
        node = folder;
    });
};

const sortNode = (node) => {
    node.children.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
        return byName(a, b);
    });
    node.children.filter((child) => child.kind === "folder").forEach(sortNode);
};

export const buildFileTree = (files = []) => {
    const root = { kind: "folder", name: "", path: "", children: [] };
    files.forEach((file) => {
        if (file?.path) insertPath(root, file);
    });
    sortNode(root);
    return root.children;
};

/** Tất cả đường dẫn folder trong cây, dùng cho "Expand all" / "Collapse all". */
export const collectFolderPaths = (nodes = []) =>
    nodes.flatMap((node) =>
        node.kind === "folder" ? [node.path, ...collectFolderPaths(node.children)] : [],
    );

/** Các extension đang có trong workspace để đổ vào bộ lọc. */
export const collectExtensions = (files = []) => {
    const set = new Set();
    files.forEach((file) => {
        if (file?.extension) set.add(file.extension.toLowerCase());
    });
    return [...set].sort();
};

const LANGUAGE_BY_EXTENSION = {
    java: "java",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    css: "css",
    scss: "css",
    html: "html",
    htm: "html",
    md: "markdown",
    markdown: "markdown",
    py: "python",
    sql: "sql",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    sh: "shell",
    bash: "shell",
    properties: "properties",
    env: "properties",
};

export const languageOfPath = (path = "") => {
    const extension = path.split(".").pop()?.toLowerCase() ?? "";
    return LANGUAGE_BY_EXTENSION[extension] || "plaintext";
};

export const extensionOfPath = (path = "") => {
    const name = path.split("/").pop() ?? "";
    const dot = name.lastIndexOf(".");
    return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
};

export const formatBytes = (bytes) => {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};
