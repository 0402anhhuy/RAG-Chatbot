import { Plus } from "lucide-react";
import TopBar, { ShortcutPills } from "@/components/layout/TopBar.jsx";

const HubNavbar = ({ activeTabName = "Projects", onNewProjectClick, onHubClick }) => {
    return (
        <TopBar
            showTriangle
            breadcrumbItems={[
                ...(onHubClick
                    ? [{ label: "Developer Hub", onClick: onHubClick }]
                    : [{ label: "Developer Hub" }]),
                { label: activeTabName },
            ]}
        >
            <ShortcutPills />
            <button type="button" className="ui-navbar-cta" onClick={onNewProjectClick}>
                <Plus size={15} />
                <span>New Project</span>
            </button>
        </TopBar>
    );
};

export default HubNavbar;
