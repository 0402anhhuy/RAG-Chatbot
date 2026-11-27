import { Code2, GitCompare, Globe, MessageCircleMore, Orbit, PersonStanding } from "lucide-react";

/** Sub-view bên trong Workbench. */
export const WORKBENCH_NAV = [
    { id: "ide", label: "IDE", icon: Code2 },
    { id: "chat", label: "Chat", icon: MessageCircleMore },
    { id: "changes", label: "Changes", icon: GitCompare },
    { id: "canvas", label: "Canvas", icon: PersonStanding },
    { id: "galaxy", label: "Galaxy", icon: Orbit },
    { id: "preview", label: "Preview", icon: Globe },
];
