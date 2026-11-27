import { ChevronsUpDown, Terminal } from "lucide-react";
import TopBar, { ShortcutPills } from "@/components/layout/TopBar.jsx";

const ProjectNavbar = ({
    projectName = "",
    activeTabName = "Dashboard",
    onSwitchProject,
    onOpenWorkbench,
    onBackToProjects,
}) => {
    return (
        <TopBar
            showTriangle
            breadcrumbItems={[
                ...(onBackToProjects
                    ? [{ label: "Projects", onClick: onBackToProjects }]
                    : []),
                {
                    label: (
                        <>
                            <strong>{projectName}</strong>
                            <ChevronsUpDown size={13} className="dropdown-caret" />
                        </>
                    ),
                    onClick: onSwitchProject,
                },
                { label: activeTabName },
            ]}
        >
            <ShortcutPills />
            <button type="button" className="ui-navbar-cta" onClick={onOpenWorkbench}>
                <Terminal size={14} />
                <span>Open Workbench</span>
            </button>
        </TopBar>
    );
};

export default ProjectNavbar;
