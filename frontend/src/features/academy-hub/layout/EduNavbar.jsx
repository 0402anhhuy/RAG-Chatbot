import { BookOpen, Flame, Loader2, UploadCloud } from "lucide-react";
import { academyHomeApi } from "@/api";
import TopBar from "@/components/layout/TopBar.jsx";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import { getSessionUserId } from "@/lib/session";

const EduNavbar = ({
    activeTabName,
    onUploadClick,
    hideControls = false,
    workspaceId,
    onHubClick,
}) => {
    const userId = getSessionUserId();

    // Số liệu navbar lấy từ cùng nguồn với tab Home: streak = ngày học liên tiếp
    // tính từ hoạt động thật, syllabus = tài liệu đã vector hoá trong workspace.
    const { data: metrics, loading } = useAsyncData(
        () =>
            academyHomeApi.get({
                ownerId: userId,
                workspaceId: workspaceId || undefined,
                range: "all",
            }),
        [userId, workspaceId, hideControls],
        { enabled: Boolean(userId) && !hideControls },
    );

    const streakDays = metrics?.streak?.days ?? 0;
    const activeToday = Boolean(metrics?.streak?.activeToday);
    const indexed = metrics?.syllabus?.indexed ?? 0;
    const processing = metrics?.syllabus?.processing ?? 0;
    const isLoading = loading && !metrics;

    return (
        <TopBar
            accent="edu"
            breadcrumbItems={[
                ...(onHubClick
                    ? [{ label: "Academy Hub", onClick: onHubClick }]
                    : [{ label: "Academy Hub" }]),
                { label: activeTabName },
            ]}
        >
            {!hideControls && (
                <>
                    <span
                        className="ui-navbar-chip streak-chip"
                        title={
                            metrics
                                ? activeToday
                                    ? "You studied today — streak kept"
                                    : "Study today to keep your streak"
                                : "Loading streak"
                        }
                    >
                        <Flame size={14} color="var(--warning)" />
                        {isLoading ? (
                            <Loader2 size={12} className="ui-spin-inline" />
                        ) : (
                            <span>
                                {streakDays} {streakDays === 1 ? "Day" : "Days"} Streak
                            </span>
                        )}
                    </span>

                    <span
                        className="ui-navbar-chip"
                        title={
                            metrics
                                ? `${indexed} ready${processing > 0 ? `, ${processing} indexing` : ""}`
                                : "Loading indexed courseware"
                        }
                    >
                        <BookOpen size={13} color="var(--success)" />
                        {isLoading ? (
                            <Loader2 size={12} className="ui-spin-inline" />
                        ) : (
                            <span>
                                {indexed} Syllabus Vectorized
                                {processing > 0 ? ` (${processing} indexing)` : ""}
                            </span>
                        )}
                    </span>

                    <button type="button" className="ui-navbar-cta accent-edu-cta" onClick={onUploadClick}>
                        <UploadCloud size={14} />
                        <span>Upload Courseware</span>
                    </button>
                </>
            )}
        </TopBar>
    );
};

export default EduNavbar;
