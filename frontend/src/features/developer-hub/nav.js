import { CheckSquare, FolderKanban, Home, MessageSquare, Settings } from "lucide-react";

/** Menu cấp ngoài cùng của Developer Hub. */
export const HUB_NAV = [
    { id: "home", label: "Home", icon: Home },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "settings", label: "Settings", icon: Settings },
];
