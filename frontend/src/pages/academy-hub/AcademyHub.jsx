import { useState } from "react";
import EduSidebar from "./components/EduSidebar";
import EduNavbar from "./components/EduNavbar";
import EduHome from "./tabs/home/EduHome";
import Courses from "./tabs/courses/Courses";
import EduTools from "./tabs/tools/EduTools";
import Quizzes from "./tabs/quizzes/Quizzes";
import Analytics from "./tabs/analytics/Analytics";
import Setting from "./tabs/settings/Setting";
import Documents from "./tabs/documents/Documents";
import Conversation from "./tabs/conversations/Conversation";
import { SocraticTutorWorkspace } from "./tabs/tools/workspaces/SocraticTutorWorkspace";
import { ExamPrepWorkspace } from "./tabs/tools/workspaces/ExamPrepWorkspace";
import { AssignmentGraderWorkspace } from "./tabs/tools/workspaces/AssignmentGraderWorkspace";
import { CoursewareRAGWorkspace } from "./tabs/tools/workspaces/CoursewareRAGWorkspace";

import "./AcademyHub.css";

const AcademyHub = () => {
    const [activeTab, setActiveTab] = useState("home");
    const [activeSubTool, setActiveSubTool] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const session = JSON.parse(
        localStorage.getItem("rag_session") ||
            '{"role":"USER","name":"Huy Tran","email":"huy@prismstudio.dev"}'
    );

    const handleLaunchTool = (toolId) => {
        setActiveSubTool(toolId);
        setIsSidebarCollapsed(true);
    };

    const handleBackToEduHub = () => {
        setActiveSubTool(null);
        setIsSidebarCollapsed(false);
    };

    return (
        <div className="vibe-edu-layout">
            <EduSidebar
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

            <div className="edu-main-viewport">
                {!activeSubTool && (
                    <EduNavbar
                        activeTabName={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        onUploadClick={() => alert("Open Upload Courseware PDF Modal")}
                    />
                )}

                <main className={`edu-canvas-body ${activeSubTool ? "no-padding-full" : ""}`}>
                    {activeTab === "home" && (
                        <EduHome
                            onNavigateTab={setActiveTab}
                            onLaunchTool={handleLaunchTool}
                        />
                    )}

                    {activeTab === "courses" && (
                        <Courses onLaunchTool={handleLaunchTool} />
                    )}

                    {activeTab === "documents" && (
                        <Documents onLaunchTool={handleLaunchTool} />
                    )}

                    {activeTab === "tools" && !activeSubTool && (
                        <EduTools onLaunchTool={handleLaunchTool} />
                    )}

                    {activeTab === "conversations" && (
                        <Conversation onLaunchTool={handleLaunchTool} />
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
    );
};

export default AcademyHub;