import {
    BarChart3,
    Bot,
    Columns3,
    LayoutDashboard,
    Settings,
    Terminal,
    Users,
    Workflow,
} from "lucide-react";

/** Menu cấp project (khi đã mở một project). */
export const PROJECT_NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "workbench", label: "Workbench", icon: Terminal },
    { id: "kanban", label: "Kanban", icon: Columns3 },
    { id: "members", label: "Members", icon: Users },
    { id: "workflows", label: "Workflows", icon: Workflow },
    { id: "agents", label: "Agents", icon: Bot },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
];
