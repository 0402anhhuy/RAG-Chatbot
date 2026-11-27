import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarRail from "@/components/layout/SidebarRail.jsx";
import { getSessionUser } from "@/lib/session";
import { workspaceApi } from "@/api";
import { EDU_NAV, EDU_SUB_TOOLS } from "@/features/academy-hub/nav.js";
import EduNavbar from "@/features/academy-hub/layout/EduNavbar.jsx";
import EduHome from "@/features/academy-hub/home/EduHome.jsx";
import Courses from "@/features/academy-hub/courses/Courses.jsx";
import EduTools from "@/features/academy-hub/tools/EduTools.jsx";
import Quizzes from "@/features/academy-hub/quizzes/Quizzes.jsx";
import Analytics from "@/features/academy-hub/analytics/Analytics.jsx";
import Setting from "@/features/academy-hub/settings/Setting.jsx";
import Documents from "@/features/academy-hub/documents/Documents.jsx";
import Conversation from "@/features/academy-hub/conversations/Conversation.jsx";
import { SocraticTutorWorkspace } from "@/features/academy-hub/tools/workspaces/SocraticTutorWorkspace.jsx";
import { ExamPrepWorkspace } from "@/features/academy-hub/tools/workspaces/ExamPrepWorkspace.jsx";
import { AssignmentGraderWorkspace } from "@/features/academy-hub/tools/workspaces/AssignmentGraderWorkspace.jsx";
import { CoursewareRAGWorkspace } from "@/features/academy-hub/tools/workspaces/CoursewareRAGWorkspace.jsx";
import { useToast } from "@/context/ToastContext.jsx";

import "@/features/academy-hub/AcademyHub.css";

const AcademyHub = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState("home");
    const [activeSubTool, setActiveSubTool] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [conversationRequest, setConversationRequest] = useState(null);

    const navigate = useNavigate();
    const session = getSessionUser();
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState(session?.workspaceId || null);

    useEffect(() => {
        if (session?.workspaceId) return undefined;
        let cancelled = false;
        workspaceApi
            .list()
            .then(async (workspaces) => {
                if (cancelled) return;
                if (workspaces?.length) {
                    setCurrentWorkspaceId(workspaces[0].id);
                    return;
                }
                const created = await workspaceApi.create({
                    name: "My Workspace",
                    description: "Default learning workspace",
                });
                if (!cancelled) setCurrentWorkspaceId(created.id);
            })
            .catch(() => {
                /* Academy tabs will show their own empty/error state. */
            });
        return () => {
            cancelled = true;
        };
    }, [session?.workspaceId]);

    const handleLaunchTool = (toolId) => {
        setActiveSubTool(toolId);
        setIsSidebarCollapsed(true);
    };

    const handleBackToEduHub = () => {
        setActiveSubTool(null);
        setIsSidebarCollapsed(false);
    };

    const handleAskTutor = (document) => {
        setConversationRequest({ document, id: Date.now() });
        setActiveSubTool(null);
        setIsSidebarCollapsed(false);
        setActiveTab("conversations");
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab !== "conversations") setConversationRequest(null);
        if (tab !== "tools") {
            setActiveSubTool(null);
            setIsSidebarCollapsed(false);
        }
    };

    // Upload đi qua tab Documents (đúng luồng upload có sẵn) thay vì alert.
    const handleUploadCourseware = () => {
        handleTabChange("documents");
        showToast("Choose a file in Documents to upload your courseware.", "info");
    };

    return (
        <div className="vibe-edu-layout">
            <EduNavbar
                activeTabName={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                workspaceId={currentWorkspaceId}
                onUploadClick={handleUploadCourseware}
                hideControls={Boolean(activeSubTool)}
                onHubClick={() => handleTabChange("home")}
            />

            <div className="edu-app-body">
                <SidebarRail
                    accent="edu"
                    items={EDU_NAV}
                    activeId={activeTab}
                    onSelect={handleTabChange}
                    collapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                    searchLabel="Search syllabus & notes..."
                    onSearch={() => handleTabChange("documents")}
                    profileName={session?.name}
                    profileSubtitle={session?.email}
                    onProfileClick={() => navigate("/overview")}
                    submenu={{
                        parentId: "tools",
                        items: EDU_SUB_TOOLS,
                        activeId: activeSubTool,
                        onSelect: (toolId) => setActiveSubTool(toolId),
                    }}
                />

                <div className="edu-main-viewport">
                    <main className={`edu-canvas-body ${activeSubTool ? "no-padding-full" : ""}`}>
                    {activeTab === "home" && (
                        <EduHome
                            workspaceId={currentWorkspaceId}
                            onNavigateTab={setActiveTab}
                            onLaunchTool={handleLaunchTool}
                        />
                    )}

                    {activeTab === "courses" && (
                        <Courses onLaunchTool={handleLaunchTool} />
                    )}

                    {activeTab === "documents" && (
                        <Documents 
                            workspaceId={currentWorkspaceId} 
                            onLaunchTool={handleLaunchTool} 
                            onAskTutor={handleAskTutor}
                        />
                    )}

                    {activeTab === "conversations" && (
                        <Conversation 
                            key={conversationRequest?.id || "default-conversation"}
                            workspaceId={currentWorkspaceId} 
                            onLaunchTool={handleLaunchTool} 
                            initialDocument={conversationRequest?.document || null}
                        />
                    )}

                    {activeTab === "tools" && !activeSubTool && (
                        <EduTools onLaunchTool={handleLaunchTool} />
                    )}

                    {activeTab === "quizzes" && (
                        <Quizzes onLaunchTool={handleLaunchTool} />
                    )}

                    {activeTab === "analytics" && (
                        <Analytics onLaunchTool={handleLaunchTool} />
                    )}

                    {activeTab === "settings" && (
                        <Setting onLaunchTool={handleLaunchTool} />
                    )}

                    {activeSubTool === "tutor" && (
                        <SocraticTutorWorkspace onBackToHub={handleBackToEduHub} />
                    )}

                    {activeSubTool === "exam_prep" && (
                        <ExamPrepWorkspace onBackToHub={handleBackToEduHub} />
                    )}

                    {activeSubTool === "grader" && (
                        <AssignmentGraderWorkspace onBackToHub={handleBackToEduHub} />
                    )}

                    {activeSubTool === "courseware" && (
                        <CoursewareRAGWorkspace onBackToHub={handleBackToEduHub} />
                    )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AcademyHub;