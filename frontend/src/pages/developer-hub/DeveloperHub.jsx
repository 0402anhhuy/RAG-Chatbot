import { useState } from "react";
import { projectApi } from "../../api";

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
    // Conversation được mở từ tab Conversations (null = mặc định)
    const [activeConversation, setActiveConversation] = useState(null);

    const [activeSubTool, setActiveSubTool] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);

    const session = JSON.parse(
        localStorage.getItem("rag_session") ||
            '{"role":"USER","name":"Huy Tran Anh","email":"huy@prismstudio.dev"}',
    );

    // Khi người dùng bấm Open Project từ trang Projects hoặc Home
    const handleOpenProject = (project) => {
        setCurrentProject(project);
        setActiveProjectTab("dashboard");
        setActiveWorkbenchSubTab("ide");
        setActiveConversation(null);
    };

    // Khi thành viên của project thay đổi: cập nhật số member trên card project
    const handleMembersChanged = () => {
        setProjectsRefreshKey((key) => key + 1);
        if (!currentProject?.id) return;
        projectApi
            .getById(currentProject.id)
            .then((project) => {
                if (project) setCurrentProject((prev) => ({ ...prev, ...project }));
            })
            .catch(() => {
                /* im lặng: số member sẽ được cập nhật ở lần tải sau */
            });
    };

    // Khi người dùng bấm vào một dòng trong tab Conversations
    const handleOpenConversation = (conversation) => {
        const project =
            conversation?.projectId
                ? {
                      id: conversation.projectId,
                      name: conversation.project || conversation.projectName || "Project",
                  }
                : currentProject;

        setActiveConversation(conversation || null);
        if (project) setCurrentProject(project);
        setActiveProjectTab("workbench");
        setActiveWorkbenchSubTab("chat");
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
                    onHubClick={() => setActiveTab("home")}
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
                    {/* Tab Members: ProjectMember tự quản lý layout và spinner riêng */}
                    {currentProject && activeProjectTab === "members" && (
                        <ProjectMember
                            project={currentProject}
                            onMembersChanged={handleMembersChanged}
                        />
                    )}
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
                                        project={currentProject}
                                        activeSubView={activeWorkbenchSubTab}
                                        conversation={activeConversation}
                                        onSubViewChange={(subTab) =>
                                            setActiveWorkbenchSubTab(subTab)
                                        }
                                        onOpenConversation={handleOpenConversation}
                                        onOpenWorkflows={() => setActiveProjectTab("workflows")}
                                    />
                                )}
                                {activeProjectTab === "kanban" && (
                                    <ProjectKanban
                                        project={currentProject}
                                        onOpenWorkbench={() => setActiveProjectTab("workbench")}
                                    />
                                )}
                                {activeProjectTab === "members" && null}
                                {activeProjectTab === "workflows" && (
                                    <ProjectWorkflow project={currentProject} />
                                )}
                                {activeProjectTab === "agents" && (
                                    <ProjectAgent project={currentProject} />
                                )}
                                {activeProjectTab === "analytics" && (
                                    <ProjectAnalytics project={currentProject} />
                                )}
                                {activeProjectTab === "settings" && (
                                    <ProjectSetting project={currentProject} />
                                )}
                            </>
                        ) : (
                            /* B. NẾU ĐANG Ở NGOÀI HUB CHÍNH */
                            <>
                                {activeTab === "home" && (
                                    <HomeTab
                                        onNavigateTab={setActiveTab}
                                        onOpenProject={handleOpenProject}
                                        refreshKey={projectsRefreshKey}
                                    />
                                )}
                                {activeTab === "projects" && (
                                    <ProjectsTab
                                        onOpenProject={handleOpenProject}
                                        refreshKey={projectsRefreshKey}
                                    />
                                )}
                                {activeTab === "conversations" && (
                                    <ConversationsTab onOpenConversation={handleOpenConversation} />
                                )}

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
                onCreate={async (newProject) => {
                    const ownerId = session?.user?.id;
                    if (!ownerId) {
                        alert("Unable to create project: no signed-in user was found.");
                        return;
                    }
                    try {
                        await projectApi.create(ownerId, {
                            name: newProject.name,
                            type: newProject.type === "Git Repository (HTTPS)" ? "REMOTE" : "LOCAL",
                            status: "IDLE",
                        });
                        setProjectsRefreshKey((key) => key + 1);
                    } catch (error) {
                        alert(error.message || "Unable to create project.");
                    }
                }}
            />
        </div>
    );
};

export default DeveloperHub;
