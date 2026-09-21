import "./BrandLogo.css";

const BrandLogo = ({
    size = "md", // "sm" | "md" | "lg"
    showText = true, // true: hiện chữ "Prism Studio", false: chỉ hiện 3 sọc
    title = "Prism Studio",
    className = "",
    onClick,
}) => {
    return (
        <div className={`prism-brand-logo ${size} ${className}`} onClick={onClick}>
            <span className="brand-mark-stripes">
                <i />
                <i />
                <i />
            </span>
            {showText && <strong className="brand-title-text">{title}</strong>}
        </div>
    );
};

export default BrandLogo;
