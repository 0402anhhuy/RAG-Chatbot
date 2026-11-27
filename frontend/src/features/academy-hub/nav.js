import {
    Award,
    BookOpen,
    CheckCircle2,
    FileText,
    GraduationCap,
    Home,
    Library,
    MessageSquare,
    Settings,
    Sparkles,
    UserCheck,
    Wrench,
} from "lucide-react";

/** Menu chính của Academy Hub. `tools` mở submenu EDU_SUB_TOOLS. */
export const EDU_NAV = [
    { id: "home", label: "Home", icon: Home },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "tools", label: "Edu Tools", icon: Wrench },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "quizzes", label: "Quizzes", icon: Award },
    { id: "analytics", label: "Analytics", icon: UserCheck },
    { id: "settings", label: "Settings", icon: Settings },
];

/** Submenu dưới mục "Edu Tools". */
export const EDU_SUB_TOOLS = [
    { id: "tutor", label: "Socratic Code Tutor", icon: GraduationCap },
    { id: "exam_prep", label: "Exam & Quiz Prep", icon: Sparkles },
    { id: "grader", label: "Assignment Grader", icon: CheckCircle2 },
    { id: "courseware", label: "Courseware RAG Index", icon: Library },
];
