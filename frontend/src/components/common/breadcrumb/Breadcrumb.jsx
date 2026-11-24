import BrandLogo from "../logo/BrandLogo";
import "./Breadcrumb.css";

/**
 * Breadcrumb dùng chung cho toàn app.
 *
 * items: [{ label: string | ReactNode, onClick?: () => void }]
 *  - item CÓ onClick  -> hiển thị dạng link bấm được
 *  - item KHÔNG onClick -> hiển thị dạng nhãn thường (đặt cuối làm trang hiện tại)
 * onHomeClick: bấm logo Prism Studio sẽ gọi hàm này.
 */
const Breadcrumb = ({ items = [], onHomeClick, className = "" }) => {
    return (
        <nav className={`prism-breadcrumb ${className}`} aria-label="Breadcrumb">
            <button
                type="button"
                className="crumb-home"
                onClick={onHomeClick}
                title="Về trang chủ"
            >
                <BrandLogo size="md" showText title="Prism Studio" />
            </button>

            {items.map((item, index) => (
                <span key={`${index}-${String(item.label).slice(0, 24)}`} className="crumb-item">
                    <span className="crumb-separator">/</span>
                    {item.onClick ? (
                        <button type="button" className="crumb-link" onClick={item.onClick}>
                            {item.label}
                        </button>
                    ) : (
                        <span className="crumb-current">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
};

export default Breadcrumb;
