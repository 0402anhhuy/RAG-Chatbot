import { useState } from "react";

// Global Layout Components
import HubSidebar from "./components/layout/HubSidebar";
import HubNavbar from "./components/layout/HubNavbar";
import NewWorkspaceModal from "./components/modals/NewWorkspaceModal";

// Project Specific Layout Components
import ProjectSidebar from "./tabs/projects/components/layout/ProjectSidebar";
import ProjectNavbar from "./tabs/projects/components/layout/ProjectNavbar";
import ProjectDashboard from "./tabs/projects/tabs/dashboard/ProjectDashboard";
import ProjectKanban from "./tabs/projects/tabs/kanban/ProjectKanban";
import ProjectMember from "./tabs/projects/tabs/member/ProjectMember";
import ProjectWorkflow from "./tabs/projects/tabs/workflows/ProjectWorkflow";
import ProjectAgent from "./tabs/projects/tabs/agents/ProjectAgent";
import ProjectAnalytics from "./tabs/projects/tabs/analytics/ProjectAnalytics";
import ProjectSetting from "./tabs/projects/tabs/setting/ProjectSetting";

// Workbench Layout & Workspace Components
import WorkbenchSidebar from "./tabs/projects/tabs/workbench/layout/WorkbenchSidebar";
import WorkbenchWorkspace from "./tabs/projects/tabs/workbench/WorkbenchWorkspace";

// Global Tabs
import HomeTab from "./tabs/home/Home";
import ProjectsTab from "./tabs/projects/Project";
import ConversationsTab from "./tabs/conversations/Conversation";
import SandboxesTab from "./tabs/sandboxes/Sandbox";
import TasksTab from "./tabs/tasks/Task";
import SettingsTab from "./tabs/settings/Setting";

import "./DeveloperHub.css";

const DeveloperHub = () => {
    // Quản lý tab ngoài Hub
    const [activeTab, setActiveTab] = useState("home");
    // Quản lý project đang được chọn (null = đang ở Hub ngoài)
    const [currentProject, setCurrentProject] = useState(null);
    // Quản lý tab con bên trong project (dashboard, workbench, kanban, members...)
    const [activeProjectTab, setActiveProjectTab] = useState("dashboard");
    // Quản lý sub-view bên trong Workbench (ide, chat, changes, canvas, galaxy, preview)
    const [activeWorkbenchSubTab, setActiveWorkbenchSubTab] = useState("ide");

    const [activeSubTool, setActiveSubTool] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const session = JSON.parse(
        localStorage.getItem("rag_session") ||
            '{"role":"USER","name":"Huy Tran Anh","email":"huy@prismstudio.dev"}',
    );

    // Khi người dùng bấm Open Project từ trang Projects hoặc Home
    const handleOpenProject = (project) => {
        setCurrentProject(project);
        setActiveProjectTab("dashboard");
        setActiveWorkbenchSubTab("ide");
    };

    // Khi người dùng bấm quay lại danh sách Hub
    const handleBackToProjects = () => {
        setCurrentProject(null);
        setActiveTab("projects");
    };

    return (
        <div className="vibe-hub-layout">
            {/* 1. ĐIỀU KIỆN RENDER NAVBAR */}
            {currentProject ? (
                <ProjectNavbar
                    projectName={currentProject.name}
                    activeTabName={
                        activeProjectTab === "workbench"
                            ? activeWorkbenchSubTab.toUpperCase()
                            : activeProjectTab.charAt(0).toUpperCase() + activeProjectTab.slice(1)
                    }
                    onBackToProjects={handleBackToProjects}
                    onOpenWorkbench={() => setActiveProjectTab("workbench")}
                />
            ) : (
                <HubNavbar
                    activeTabName={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                    onNewProjectClick={() => setIsCreateModalOpen(true)}
                />
            )}

            <div className="vibe-hub-content">
                {/* 2. ĐIỀU KIỆN RENDER SIDEBAR (3 CẤP ĐỘ) */}
                {currentProject ? (
                    activeProjectTab === "workbench" ? (
                        <WorkbenchSidebar
                            activeWorkbenchTab={activeWorkbenchSubTab}
                            onTabChange={(subTab) => setActiveWorkbenchSubTab(subTab)}
                            isCollapsed={isSidebarCollapsed}
                            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                            session={session}
                        />
                    ) : (
                        <ProjectSidebar
                            activeProjectTab={activeProjectTab}
                            onTabChange={(tab) => setActiveProjectTab(tab)}
                            isCollapsed={isSidebarCollapsed}
                            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                            session={session}
                        />
                    )
                ) : (
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
                        onSelectSubTool={(toolId) => {
                            setActiveTab("tools");
                            setActiveSubTool(toolId);
                        }}
                    />
                )}

                {/* 3. VIEWPORT NỘI DUNG */}
                <div className="vibe-main-viewport">
                    <main
                        className={`vibe-canvas-body ${
                            activeProjectTab === "workbench" ? "no-padding-full" : ""
                        }`}
                    >
                        {/* A. NẾU ĐANG TRONG 1 PROJECT CỤ THỂ */}
                        {currentProject ? (
                            <>
                                {activeProjectTab === "dashboard" && (
                                    <ProjectDashboard
                                        project={currentProject}
                                        onOpenWorkbench={() => setActiveProjectTab("workbench")}
                                        onNavigateKanban={() => setActiveProjectTab("kanban")}
                                    />
                                )}
                                {activeProjectTab === "workbench" && (
                                    <WorkbenchWorkspace
                                        activeSubView={activeWorkbenchSubTab}
                                        onSubViewChange={(subTab) =>
                                            setActiveWorkbenchSubTab(subTab)
                                        }
                                    />
                                )}
                                {activeProjectTab === "kanban" && (
                                    <ProjectKanban
                                        onOpenWorkbench={() => setActiveProjectTab("workbench")}
                                        onNewTaskClick={() => setIsCreateModalOpen(true)}
                                    />
                                )}
                                {activeProjectTab === "members" && <ProjectMember />}
                                {activeProjectTab === "workflows" && <ProjectWorkflow />}
                                {activeProjectTab === "agents" && <ProjectAgent />}
                                {activeProjectTab === "analytics" && <ProjectAnalytics />}
                                {activeProjectTab === "settings" && (
                                    <ProjectSetting projectName={currentProject?.name} />
                                )}
                            </>
                        ) : (
                            /* B. NẾU ĐANG Ở NGOÀI HUB CHÍNH */
                            <>
                                {activeTab === "home" && (
                                    <HomeTab
                                        onNavigateTab={setActiveTab}
                                        onOpenProject={handleOpenProject}
                                    />
                                )}
                                {activeTab === "projects" && (
                                    <ProjectsTab onOpenProject={handleOpenProject} />
                                )}
                                {activeTab === "conversations" && <ConversationsTab />}
                                {activeTab === "sandboxes" && <SandboxesTab />}
                                {activeTab === "tasks" && <TasksTab />}
                                {activeTab === "settings" && <SettingsTab />}
                            </>
                        )}
                    </main>
                </div>
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
