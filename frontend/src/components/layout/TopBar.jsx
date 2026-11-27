import { BookOpen, Compass, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb.jsx";
import TriangleField from "@/components/canvas/TriangleField.jsx";
import "./TopBar.css";

/**
 * Thanh trên cùng dùng chung (Developer Hub / Project / Academy Hub).
 * Chỉ nhận breadcrumb + cụm hành động bên phải, không tự quyết định nghiệp vụ.
 *
 * @param {Array}  breadcrumbItems  [{ label, onClick }]
 * @param {boolean} showTriangle    Bật nền tam giác động (Developer Hub)
 * @param {ReactNode} children      Cụm hành động bên phải
 * @param {"default"|"edu"} accent
 */
const TopBar = ({ breadcrumbItems = [], showTriangle = false, accent = "default", children }) => {
    const navigate = useNavigate();

    return (
        <header className={`ui-navbar accent-${accent}`}>
            {showTriangle && <TriangleField />}

            <div className="ui-navbar-breadcrumbs">
                <Breadcrumb
                    onHomeClick={() => navigate("/overview")}
                    items={breadcrumbItems}
                />
            </div>

            <div className="ui-navbar-actions">{children}</div>
        </header>
    );
};

/** Cụm phím tắt (Ctrl+G / ? / Ctrl+H) dùng ở navbar Developer Hub & Project. */
export const ShortcutPills = () => (
    <div className="ui-navbar-pills">
        <span className="ui-shortcut-tag" title="Navigate (Ctrl+G)">
            <Compass size={13} />
            <span>Ctrl G</span>
        </span>
        <span className="ui-shortcut-tag mini" title="Help (?)">
            <HelpCircle size={13} />
        </span>
        <span className="ui-shortcut-tag" title="History (Ctrl+H)">
            <BookOpen size={13} />
            <span>Ctrl H</span>
        </span>
    </div>
);

export default TopBar;
