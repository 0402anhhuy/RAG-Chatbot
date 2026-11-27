import { useState } from "react";
import { projectApi } from "@/api";

import SidebarRail from "@/components/layout/SidebarRail.jsx";
import { getSessionUser } from "@/lib/session";
import { HUB_NAV } from "@/features/developer-hub/nav.js";

// Global Layout Components
import HubNavbar from "@/features/developer-hub/layout/HubNavbar.jsx";
import NewWorkspaceModal from "@/features/developer-hub/modals/NewWorkspaceModal.jsx";

// Project Specific Layout Components
import { PROJECT_NAV } from "@/features/developer-hub/projects/nav.js";
import ProjectNavbar from "@/features/developer-hub/projects/layout/ProjectNavbar.jsx";
import ProjectDashboard from "@/features/developer-hub/projects/dashboard/ProjectDashboard.jsx";
import ProjectKanban from "@/features/developer-hub/projects/kanban/ProjectKanban.jsx";
import ProjectMember from "@/features/developer-hub/projects/member/ProjectMember.jsx";
import ProjectWorkflow from "@/features/developer-hub/projects/workflows/ProjectWorkflow.jsx";
import ProjectAgent from "@/features/developer-hub/projects/agents/ProjectAgent.jsx";
import ProjectAnalytics from "@/features/developer-hub/projects/analytics/ProjectAnalytics.jsx";
import ProjectSetting from "@/features/developer-hub/projects/setting/ProjectSetting.jsx";

// Workbench Layout & Workspace Components
import { WORKBENCH_NAV } from "@/features/developer-hub/projects/workbench/nav.js";
import WorkbenchWorkspace from "@/features/developer-hub/projects/workbench/WorkbenchWorkspace.jsx";

// Global Tabs
import HomeTab from "@/features/developer-hub/home/Home.jsx";
import ProjectsTab from "@/features/developer-hub/projects/Project.jsx";
import ConversationsTab from "@/features/developer-hub/conversations/Conversation.jsx";
import TasksTab from "@/features/developer-hub/tasks/Task.jsx";
import SettingsTab from "@/features/developer-hub/settings/Setting.jsx";

import "@/features/developer-hub/DeveloperHub.css";

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

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);

    const session = getSessionUser();

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
                        <SidebarRail
                            items={WORKBENCH_NAV}
                            activeId={activeWorkbenchSubTab}
                            onSelect={(subTab) => setActiveWorkbenchSubTab(subTab)}
                            collapsed={isSidebarCollapsed}
                            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                            searchLabel="Search"
                            onSearch={() => setActiveWorkbenchSubTab("ide")}
                            profileName={session?.name}
                            profileSubtitle={session?.email}
                        />
                    ) : (
                        <SidebarRail
                            items={PROJECT_NAV}
                            activeId={activeProjectTab}
                            onSelect={(tab) => setActiveProjectTab(tab)}
                            collapsed={isSidebarCollapsed}
                            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                            searchLabel="Search"
                            onSearch={() => setActiveProjectTab("workbench")}
                            profileName={session?.name}
                            profileSubtitle={session?.email}
                        />
                    )
                ) : (
                    <SidebarRail
                        items={HUB_NAV}
                        activeId={activeTab}
                        onSelect={(tab) => {
                            setActiveTab(tab);
                            setIsSidebarCollapsed(false);
                        }}
                        collapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                        searchLabel="Search"
                        onSearch={() => setActiveTab("projects")}
                        profileName={session?.name}
                        profileSubtitle={session?.email}
                        onProfileClick={() => setActiveTab("settings")}
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
                    const ownerId = session?.id;
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
