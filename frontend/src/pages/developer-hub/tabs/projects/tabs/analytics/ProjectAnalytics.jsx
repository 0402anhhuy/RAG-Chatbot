import { useState } from "react";
import {
    BarChart3,
    DollarSign,
    Code,
    ChevronDown,
    ArrowDownToLine,
    ArrowUpFromLine,
    Database,
    ListTree,
    Plus,
    Minus,
    Zap,
    CheckCircle2,
    Trash2,
    Download,
    FileSpreadsheet,
    FileCode,
} from "lucide-react";
import "./ProjectAnalytics.css";

const PROVIDER_MODELS_DATA = [
    {
        provider: "fpt-starter-vn",
        model: "DeepSeek-V4-Flash",
        cost: "$1.52",
        inOut: "4.9M / 110.6K",
        cache: "33.9M / 0",
        steps: 315,
        percent: "59.9%",
    },
    {
        provider: "amazon-bedrock-starter",
        model: "us.openai.gpt-5.6-luna",
        cost: "$0.92",
        inOut: "11.0K / 48.2K",
        cache: "13.3M / 1.6M",
        steps: 86,
        percent: "36.4%",
    },
    {
        provider: "fpt-starter-vn",
        model: "GLM-5.2",
        cost: "$0.04",
        inOut: "25.8K / 18",
        cache: "8.8K / 0",
        steps: 1,
        percent: "1.7%",
    },
    {
        provider: "google-starter",
        model: "gemini-3.8-flash",
        cost: "$0.03",
        inOut: "35.9K / 14",
        cache: "0 / 0",
        steps: 1,
        percent: "1.2%",
    },
    {
        provider: "fpt-starter-vn",
        model: "Qwen3.8-27B",
        cost: "$0.02",
        inOut: "31.0K / 40",
        cache: "4.8K / 0",
        steps: 1,
        percent: "0.6%",
    },
    {
        provider: "fpt-starter-vn",
        model: "gemma-4-26B-A4B-it",
        cost: "$0.01",
        inOut: "34.2K / 18",
        cache: "0 / 0",
        steps: 1,
        percent: "0.2%",
    },
];

const ProjectAnalytics = () => {
    const [subTab, setSubTab] = useState("overview"); // "overview" | "cost" | "code"
    const [selectedMonth, setSelectedMonth] = useState("October 2026");

    return (
        <div className="vibe-analytics-viewport">
            {/* Header: Title & Month Dropdown */}
            <div className="analytics-header-row">
                <div className="analytics-title-cluster">
                    <BarChart3 size={20} className="analytics-title-glyph" />
                    <h2>Analytics</h2>
                </div>

                <div className="analytics-month-pill-wrap">
                    <span>{selectedMonth}</span>
                    <ChevronDown size={14} />
                </div>
            </div>

            {/* Sub-tabs Switcher */}
            <div className="analytics-subtabs-toolbar">
                <div className="analytics-subtabs-pill-box">
                    <button
                        type="button"
                        className={`btn-subtab-pill ${subTab === "overview" ? "active" : ""}`}
                        onClick={() => setSubTab("overview")}
                    >
                        <BarChart3 size={13} />
                        <span>Overview</span>
                    </button>
                    <button
                        type="button"
                        className={`btn-subtab-pill ${subTab === "cost" ? "active" : ""}`}
                        onClick={() => setSubTab("cost")}
                    >
                        <DollarSign size={13} />
                        <span>Cost & Usage</span>
                    </button>
                    <button
                        type="button"
                        className={`btn-subtab-pill ${subTab === "code" ? "active" : ""}`}
                        onClick={() => setSubTab("code")}
                    >
                        <Code size={13} />
                        <span>Code Activity</span>
                    </button>
                </div>

                {/* Nút Xuất Báo Cáo khi ở tab Cost & Usage */}
                {subTab === "cost" && (
                    <div className="analytics-export-cluster">
                        <button type="button" className="btn-csv-dropdown">
                            <span>CSV</span>
                            <ChevronDown size={13} />
                        </button>
                        <button type="button" className="btn-export-outline">
                            <Download size={13} />
                            <span>Export</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 1. NỘI DUNG VIEW: OVERVIEW                                */}
            {/* ======================================================== */}
            {subTab === "overview" && (
                <div className="analytics-view-stack">
                    {/* Hàng 6 KPI Tổng quát */}
                    <div className="kpi-six-cards-grid">
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">$ Total Cost</span>
                            <strong className="kpi-analytic-value">$2.54</strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <ArrowDownToLine size={12} /> Tokens In
                            </span>
                            <strong className="kpi-analytic-value">5.1M</strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <ArrowUpFromLine size={12} /> Tokens Out
                            </span>
                            <strong className="kpi-analytic-value">159.0K</strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <Database size={12} /> Cache R / W
                            </span>
                            <strong className="kpi-analytic-value">47.2M</strong>
                            <small className="kpi-analytic-sub">write 1.6M</small>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <ListTree size={12} /> Steps
                            </span>
                            <strong className="kpi-analytic-value">405</strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">+ Lines of Code</span>
                            <strong className="kpi-analytic-value">45</strong>
                            <small className="kpi-analytic-sub">-1 · 3 files</small>
                        </div>
                    </div>

                    {/* COST PER OUTCOME */}
                    <div className="outcome-section-block">
                        <span className="outcome-section-title">COST PER OUTCOME</span>
                        <div className="outcome-four-cards-grid">
                            <div className="kpi-outcome-card">
                                <span className="kpi-outcome-label">
                                    <Zap size={13} /> Cost / Task
                                </span>
                                <strong className="kpi-outcome-value">$2.54</strong>
                                <small className="kpi-outcome-sub">1 tasks</small>
                            </div>
                            <div className="kpi-outcome-card">
                                <span className="kpi-outcome-label">
                                    <CheckCircle2 size={13} /> Cost / Completed
                                </span>
                                <strong className="kpi-outcome-value">—</strong>
                                <small className="kpi-outcome-sub">0 shipped</small>
                            </div>
                            <div className="kpi-outcome-card">
                                <span className="kpi-outcome-label">
                                    <Code size={13} /> Cost / AI-authored line
                                </span>
                                <strong className="kpi-outcome-value">$0.055</strong>
                            </div>
                            <div className="kpi-outcome-card">
                                <span className="kpi-outcome-label">
                                    <Trash2 size={13} /> % Tokens on Abandoned
                                </span>
                                <strong className="kpi-outcome-value">—</strong>
                                <small className="kpi-outcome-sub">
                                    no spend on abandoned tasks
                                </small>
                            </div>
                        </div>
                    </div>

                    {/* Biểu đồ Cost trend */}
                    <div className="chart-panel-card">
                        <div className="chart-panel-header">
                            <h4>Cost trend</h4>
                            <span className="chart-legend-text">Project</span>
                        </div>
                        <div className="chart-svg-wrapper">
                            <svg
                                className="chart-svg"
                                viewBox="0 0 900 200"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                {/* Grid lines */}
                                <line
                                    x1="40"
                                    y1="30"
                                    x2="880"
                                    y2="30"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="75"
                                    x2="880"
                                    y2="75"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="120"
                                    x2="880"
                                    y2="120"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="165"
                                    x2="880"
                                    y2="165"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />

                                {/* Area fill */}
                                <path
                                    d="M 40,165 L 40,155 Q 180,135 240,140 T 420,160 Q 560,170 610,130 T 730,40 L 880,45 L 880,165 Z"
                                    fill="url(#costGradient)"
                                />

                                {/* Đường tím nền phẳng */}
                                <line
                                    x1="40"
                                    y1="165"
                                    x2="880"
                                    y2="165"
                                    stroke="#8b5cf6"
                                    strokeWidth="2"
                                />

                                {/* Đường vàng hổ phách chính */}
                                <path
                                    d="M 40,155 Q 180,135 240,140 T 420,160 Q 560,170 610,130 T 730,40 L 880,45"
                                    fill="none"
                                    stroke="#f59e0b"
                                    strokeWidth="2.5"
                                />
                            </svg>
                            <div className="chart-axis-y">
                                <span>$1.00</span>
                                <span>$0.75</span>
                                <span>$0.50</span>
                                <span>$0.25</span>
                                <span>$0.00</span>
                            </div>
                            <div className="chart-axis-x">
                                <span>Oct 1</span>
                                <span>Oct 2</span>
                                <span>Oct 5</span>
                                <span>Oct 6</span>
                                <span>Oct 7</span>
                                <span>Oct 8</span>
                            </div>
                        </div>
                    </div>

                    {/* Biểu đồ Code activity */}
                    <div className="chart-panel-card">
                        <div className="chart-panel-header">
                            <h4>Code activity</h4>
                            <span className="chart-legend-text">Lines added / removed, daily</span>
                        </div>
                        <div className="chart-svg-wrapper">
                            <svg
                                className="chart-svg"
                                viewBox="0 0 900 200"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="codeGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                <line
                                    x1="40"
                                    y1="30"
                                    x2="880"
                                    y2="30"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="75"
                                    x2="880"
                                    y2="75"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="120"
                                    x2="880"
                                    y2="120"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="165"
                                    x2="880"
                                    y2="165"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />

                                <polygon
                                    points="40,75 880,165 880,165 40,165"
                                    fill="url(#codeGradient)"
                                />
                                <line
                                    x1="40"
                                    y1="75"
                                    x2="880"
                                    y2="165"
                                    stroke="#10b981"
                                    strokeWidth="2.5"
                                />
                                <line
                                    x1="40"
                                    y1="165"
                                    x2="880"
                                    y2="165"
                                    stroke="#ef4444"
                                    strokeWidth="2"
                                />
                            </svg>
                            <div className="chart-axis-y">
                                <span>60</span>
                                <span>45</span>
                                <span>30</span>
                                <span>15</span>
                                <span>0</span>
                            </div>
                            <div className="chart-axis-x">
                                <span>Oct 1</span>
                                <span>Oct 5</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 2. NỘI DUNG VIEW: COST & USAGE                           */}
            {/* ======================================================== */}
            {subTab === "cost" && (
                <div className="analytics-view-stack">
                    {/* Biểu đồ Daily LLM Cost kèm Tooltip */}
                    <div className="chart-panel-card">
                        <div className="chart-panel-header">
                            <h4>Daily LLM cost</h4>
                            <span className="chart-legend-text">Project vs personal spend</span>
                        </div>
                        <div className="chart-svg-wrapper with-tooltip">
                            <svg
                                className="chart-svg"
                                viewBox="0 0 900 200"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="costGradient2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                <line
                                    x1="40"
                                    y1="30"
                                    x2="880"
                                    y2="30"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="75"
                                    x2="880"
                                    y2="75"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="120"
                                    x2="880"
                                    y2="120"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="165"
                                    x2="880"
                                    y2="165"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />

                                <path
                                    d="M 40,165 L 40,155 Q 180,135 240,140 T 420,160 Q 560,170 610,130 T 730,40 L 880,45 L 880,165 Z"
                                    fill="url(#costGradient2)"
                                />
                                <line
                                    x1="40"
                                    y1="165"
                                    x2="880"
                                    y2="165"
                                    stroke="#8b5cf6"
                                    strokeWidth="2"
                                />
                                <path
                                    d="M 40,155 Q 180,135 240,140 T 420,160 Q 560,170 610,130 T 730,40 L 880,45"
                                    fill="none"
                                    stroke="#f59e0b"
                                    strokeWidth="2.5"
                                />

                                {/* Điểm đánh dấu Oct 2 */}
                                <circle cx="240" cy="140" r="4" fill="#f59e0b" />
                                <circle cx="240" cy="165" r="4" fill="#8b5cf6" />
                            </svg>

                            {/* Tooltip Card Oct 2 */}
                            <div
                                className="chart-floating-tooltip"
                                style={{ left: "19%", top: "15%" }}
                            >
                                <div className="tooltip-date-header">Oct 2</div>
                                <div className="tooltip-item-row">
                                    <span className="dot-circle blue" />
                                    <span>Project</span>
                                    <strong>$0.00</strong>
                                </div>
                                <div className="tooltip-item-row">
                                    <span className="dot-circle purple" />
                                    <span>Personal</span>
                                    <strong>$0.00</strong>
                                </div>
                                <div className="tooltip-item-row">
                                    <span className="dot-circle amber" />
                                    <span>Platform</span>
                                    <strong>$0.28</strong>
                                </div>
                            </div>

                            <div className="chart-axis-y">
                                <span>$1.00</span>
                                <span>$0.75</span>
                                <span>$0.50</span>
                                <span>$0.25</span>
                                <span>$0.00</span>
                            </div>
                            <div className="chart-axis-x">
                                <span>Oct 1</span>
                                <span>Oct 2</span>
                                <span>Oct 5</span>
                                <span>Oct 6</span>
                                <span>Oct 7</span>
                                <span>Oct 8</span>
                            </div>
                        </div>
                    </div>

                    {/* Bảng By Provider / Model */}
                    <div className="analytics-section-panel">
                        <h4 className="section-panel-title">By Provider / Model</h4>
                        <div className="analytics-table-card">
                            <table className="analytics-data-table">
                                <thead>
                                    <tr>
                                        <th>Provider</th>
                                        <th>Model</th>
                                        <th>Cost</th>
                                        <th>In / Out</th>
                                        <th>Cache R / W</th>
                                        <th>Steps</th>
                                        <th>% of Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {PROVIDER_MODELS_DATA.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="td-provider">{row.provider}</td>
                                            <td className="td-model">{row.model}</td>
                                            <td className="td-cost">{row.cost}</td>
                                            <td className="td-inout">{row.inOut}</td>
                                            <td className="td-cache">{row.cache}</td>
                                            <td className="td-steps">{row.steps}</td>
                                            <td className="td-percent">{row.percent}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bảng By User */}
                    <div className="analytics-section-panel">
                        <div className="section-header-caption-line">
                            <h4 className="section-panel-title">By User</h4>
                            <span className="caption-subtext">
                                — click a user to see their tasks
                            </span>
                        </div>
                        <div className="analytics-table-card">
                            <table className="analytics-data-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Project Cost</th>
                                        <th>Personal Cost</th>
                                        <th>In / Out</th>
                                        <th>Cache R / W</th>
                                        <th>Steps</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="user-table-cell">
                                                <div className="avatar-chip-small">HT</div>
                                                <strong>Huy Tran Anh</strong>
                                            </div>
                                        </td>
                                        <td>$0.00</td>
                                        <td>$0.00</td>
                                        <td>5.1M / 159.0K</td>
                                        <td>47.2M / 1.6M</td>
                                        <td>405</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 3. NỘI DUNG VIEW: CODE ACTIVITY                          */}
            {/* ======================================================== */}
            {subTab === "code" && (
                <div className="analytics-view-stack">
                    {/* 4 Thẻ KPI Code Activity */}
                    <div className="kpi-four-cards-grid">
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">+ Lines Added</span>
                            <strong className="kpi-analytic-value">+45</strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">— Lines Removed</span>
                            <strong className="kpi-analytic-value">-1</strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <Code size={12} /> Net Change
                            </span>
                            <strong className="kpi-analytic-value">+44</strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <FileCode size={12} /> Files Changed
                            </span>
                            <strong className="kpi-analytic-value">3</strong>
                        </div>
                    </div>

                    {/* Biểu đồ Code activity */}
                    <div className="chart-panel-card">
                        <div className="chart-panel-header">
                            <h4>Code activity</h4>
                            <span className="chart-legend-text">Lines added / removed, daily</span>
                        </div>
                        <div className="chart-svg-wrapper">
                            <svg
                                className="chart-svg"
                                viewBox="0 0 900 200"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="codeGradient2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                <line
                                    x1="40"
                                    y1="30"
                                    x2="880"
                                    y2="30"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="75"
                                    x2="880"
                                    y2="75"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="120"
                                    x2="880"
                                    y2="120"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />
                                <line
                                    x1="40"
                                    y1="165"
                                    x2="880"
                                    y2="165"
                                    stroke="#f1f5f9"
                                    strokeWidth="1"
                                />

                                <polygon
                                    points="40,75 880,165 880,165 40,165"
                                    fill="url(#codeGradient2)"
                                />
                                <line
                                    x1="40"
                                    y1="75"
                                    x2="880"
                                    y2="165"
                                    stroke="#10b981"
                                    strokeWidth="2.5"
                                />
                                <line
                                    x1="40"
                                    y1="165"
                                    x2="880"
                                    y2="165"
                                    stroke="#ef4444"
                                    strokeWidth="2"
                                />
                            </svg>
                            <div className="chart-axis-y">
                                <span>60</span>
                                <span>45</span>
                                <span>30</span>
                                <span>15</span>
                                <span>0</span>
                            </div>
                            <div className="chart-axis-x">
                                <span>Oct 1</span>
                                <span>Oct 5</span>
                            </div>
                        </div>
                    </div>

                    {/* Bảng By Member */}
                    <div className="analytics-section-panel">
                        <h4 className="section-panel-title">By Member</h4>
                        <div className="analytics-table-card">
                            <table className="analytics-data-table">
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Lines+</th>
                                        <th>Lines-</th>
                                        <th>Net</th>
                                        <th>Files</th>
                                        <th>Runs</th>
                                        <th>Lines/Run</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="user-table-cell">
                                                <div className="avatar-chip-small">HT</div>
                                                <strong>Huy Tran Anh</strong>
                                            </div>
                                        </td>
                                        <td className="text-green-bold">+45</td>
                                        <td className="text-red-bold">-1</td>
                                        <td className="text-green-bold">+44</td>
                                        <td>3</td>
                                        <td>3</td>
                                        <td>15</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectAnalytics;
