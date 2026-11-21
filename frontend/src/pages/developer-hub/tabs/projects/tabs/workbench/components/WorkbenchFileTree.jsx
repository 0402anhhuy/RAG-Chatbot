import { ChevronDown, ChevronRight, FileCode, FileText, Folder, FolderOpen } from "lucide-react";

const FILE_ICON_BY_LANGUAGE = {
    java: FileCode,
    javascript: FileCode,
    typescript: FileCode,
    python: FileCode,
    json: FileCode,
    sql: FileCode,
    html: FileCode,
    css: FileCode,
};

const iconFor = (node) => {
    if (node.kind === "folder") return null;
    return FILE_ICON_BY_LANGUAGE[node.language] || FileText;
};

const TreeNode = ({ node, depth, expanded, activePath, onToggleFolder, onOpenFile }) => {
    const indent = { paddingLeft: `${8 + depth * 12}px` };

    if (node.kind === "folder") {
        const isOpen = expanded.has(node.path);
        return (
            <div className="wb-tree-branch">
                <button
                    type="button"
                    className="wb-tree-row folder"
                    style={indent}
                    onClick={() => onToggleFolder(node.path)}
                >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {isOpen ? (
                        <FolderOpen size={13} className="wb-tree-folder-icon" />
                    ) : (
                        <Folder size={13} className="wb-tree-folder-icon" />
                    )}
                    <span className="wb-tree-label">{node.name}</span>
                </button>
                {isOpen &&
                    node.children.map((child) => (
                        <TreeNode
                            key={`${child.kind}:${child.path}`}
                            node={child}
                            depth={depth + 1}
                            expanded={expanded}
                            activePath={activePath}
                            onToggleFolder={onToggleFolder}
                            onOpenFile={onOpenFile}
                        />
                    ))}
            </div>
        );
    }

    const Icon = iconFor(node);
    const isActive = activePath === node.path;

    return (
        <button
            type="button"
            className={`wb-tree-row file ${isActive ? "active" : ""}`}
            style={indent}
            onClick={() => onOpenFile(node)}
            title={node.path}
        >
            <Icon size={13} className="wb-tree-file-icon" />
            <span className="wb-tree-label">{node.name}</span>
            {node.editedByUser && <span className="wb-tree-edited-dot" title="Edited by you" />}
        </button>
    );
};

const WorkbenchFileTree = ({ nodes = [], expanded, activePath, onToggleFolder, onOpenFile }) => {
    if (!nodes.length) {
        return null;
    }
    return (
        <div className="wb-tree-scroll">
            {nodes.map((node) => (
                <TreeNode
                    key={`${node.kind}:${node.path}`}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    activePath={activePath}
                    onToggleFolder={onToggleFolder}
                    onOpenFile={onOpenFile}
                />
            ))}
        </div>
    );
};

export default WorkbenchFileTree;
