import { useCallback, useEffect, useState } from "react";
import { BookOpen, Flame, Loader2, UploadCloud } from "lucide-react";
import { academyHomeApi } from "../../../api";
import BrandLogo from "../../../components/common/logo/BrandLogo";
import { useToast } from "../../../context/ToastContext";
import "./EduNavbar.css";

const getSessionUser = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem("rag_session") || "{}");
        return parsed?.user || parsed || {};
    } catch {
        return {};
    }
};

const EduNavbar = ({ activeTabName, onUploadClick, hideControls = false, workspaceId }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(false);

    // Số liệu navbar lấy từ cùng nguồn với tab Home: streak = ngày học liên tiếp
    // tính từ hoạt động thật, syllabus = tài liệu đã vector hoá trong workspace.
    const loadMetrics = useCallback(
        async (signal) => {
            if (!sessionUser?.id) {
                setMetrics(null);
                return;
            }
            try {
                setLoading(true);
                const data = await academyHomeApi.get({
                    ownerId: sessionUser.id,
                    workspaceId: workspaceId || undefined,
                    range: "all",
                });
                if (signal?.cancelled) return;
                setMetrics(data);
            } catch (err) {
                if (signal?.cancelled) return;
                setMetrics(null);
                showToast(err.message || "Unable to load study metrics.", "error");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [sessionUser?.id, workspaceId, showToast],
    );

    useEffect(() => {
        if (hideControls) return undefined;
        const signal = { cancelled: false };
        loadMetrics(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [hideControls, loadMetrics]);

    const streakDays = metrics?.streak?.days ?? 0;
    const activeToday = Boolean(metrics?.streak?.activeToday);
    const indexed = metrics?.syllabus?.indexed ?? 0;
    const processing = metrics?.syllabus?.processing ?? 0;

    return (
        <header className="edu-navbar">
            <div className="navbar-identity">
                <BrandLogo size="md" showText title="Prism Studio" />
                <div className="navbar-breadcrumb">
                    <span className="crumb-separator">/</span>
                    <span className="crumb-hub">Academy Hub</span>
                    <span className="crumb-separator">/</span>
                    <span className="crumb-current">{activeTabName}</span>
                </div>
            </div>

            {!hideControls && (
                <div className="navbar-controls-cluster">
                    {/* Streak Counter — chuỗi ngày có hoạt động học */}
                    <div
                        className="navbar-metric-chip streak-chip"
                        title={
                            metrics
                                ? activeToday
                                    ? "You studied today — streak kept"
                                    : "Study today to keep your streak"
                                : "Loading streak"
                        }
                    >
                        <Flame size={14} color="#f59e0b" />
                        {loading && !metrics ? (
                            <Loader2 size={12} className="ws-spinner" />
                        ) : (
                            <span>
                                {streakDays} {streakDays === 1 ? "Day" : "Days"} Streak
                            </span>
                        )}
                    </div>

                    <div
                        className="navbar-metric-chip"
                        title={
                            metrics
                                ? `${indexed} ready${processing > 0 ? `, ${processing} indexing` : ""}`
                                : "Loading indexed courseware"
                        }
                    >
                        <BookOpen size={13} color="#059669" />
                        {loading && !metrics ? (
                            <Loader2 size={12} className="ws-spinner" />
                        ) : (
                            <span>
                                {indexed} Syllabus Vectorized
                                {processing > 0 ? ` (${processing} indexing)` : ""}
                            </span>
                        )}
                    </div>

                    <button type="button" className="btn-primary-edu" onClick={onUploadClick}>
                        <UploadCloud size={14} />
                        <span>Upload Courseware</span>
                    </button>
                </div>
            )}
        </header>
    );
};

export default EduNavbar;
