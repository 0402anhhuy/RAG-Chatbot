import { useState } from "react";
import HubSidebar from "./components/HubSidebar";
import HubNavbar from "./components/HubNavbar";
import NewWorkspaceModal from "./components/modals/NewWorkspaceModal";

// Import các Tab Views
import HomeTab from "./tabs/home/Home";
import ProjectsTab from "./tabs/projects/Project";
import Tool from "./tabs/tools/Tool";
import ConversationsTab from "./tabs/conversations/Conversation";
import SandboxesTab from "./tabs/sandboxes/Sandbox";
import TasksTab from "./tabs/tasks/Task";
import SettingsTab from "./tabs/settings/Setting";

// Import Không gian làm việc chi tiết của Tool Source Code Review
import CodeReviewWorkspace from "./tabs/tools/code-review/CodeReviewWorkspace";

import "./DeveloperHub.css";

const DeveloperHub = () => {
    const [activeTab, setActiveTab] = useState("tools");
    const [activeSubTool, setActiveSubTool] = useState(null); // 'code_review' | null
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const session = JSON.parse(
        localStorage.getItem("rag_session") ||
            '{"role":"USER","name":"Huy Tran Anh","email":"huy@prismstudio.dev"}',
    );

    // Khi người dùng bấm Launch vào một công cụ
    const handleLaunchTool = (toolId) => {
        setActiveSubTool(toolId);
        setIsSidebarCollapsed(true); // Tự động thu nhỏ thanh ngoài cùng khi vào tool
    };

    // Khi người dùng bấm nút quay lại từ bên trong tool
    const handleBackToToolsCatalog = () => {
        setActiveSubTool(null);
        setIsSidebarCollapsed(false); // Trả lại kích thước lớn mặc định
    };

    return (
        <div className="vibe-hub-layout">
            <HubSidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (tab !== "tools") {
                        setActiveSubTool(null);
                        setIsSidebarCollapsed(false);
                    }
                }}
                session={session}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                activeSubTool={activeSubTool}
                onSelectSubTool={(toolId) => setActiveSubTool(toolId)}
            />

            <div className="vibe-main-viewport">
                {/* Chỉ hiện Navbar của Hub khi không ở trong tool chi tiết */}
                {!activeSubTool && (
                    <HubNavbar
                        activeTabName={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        onNewProjectClick={() => setIsCreateModalOpen(true)}
                    />
                )}

                <main className={`vibe-canvas-body ${activeSubTool ? "no-padding-full" : ""}`}>
                    {/* 1. KHI ĐANG TRONG SOURCE CODE REVIEW WORKSPACE */}
                    {activeTab === "tools" && activeSubTool === "code_review" && (
                        <CodeReviewWorkspace onBackToHub={handleBackToToolsCatalog} />
                    )}

                    {/* 2. KHI Ở TRANG TOOLS CHUNG (CATALOG) */}
                    {activeTab === "tools" && !activeSubTool && (
                        <Tool onLaunchTool={handleLaunchTool} />
                    )}

                    {/* 3. CÁC TABS KHÁC */}
                    {activeTab === "home" && <HomeTab onNavigateTab={setActiveTab} />}
                    {activeTab === "projects" && <ProjectsTab />}
                    {activeTab === "conversations" && <ConversationsTab />}
                    {activeTab === "sandboxes" && <SandboxesTab />}
                    {activeTab === "tasks" && <TasksTab />}
                    {activeTab === "settings" && <SettingsTab />}
                </main>
            </div>

            <NewWorkspaceModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={(newProject) => alert(`Created: ${newProject.name}`)}
            />
        </div>
    );
};

export default DeveloperHub;
