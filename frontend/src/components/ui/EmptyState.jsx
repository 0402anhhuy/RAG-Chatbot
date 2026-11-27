import "./EmptyState.css";

/** Trạng thái rỗng / lỗi dùng chung: icon + tiêu đề + mô tả + action tuỳ chọn. */
const EmptyState = ({ icon: Icon, title, description, action = null, tone = "neutral" }) => {
    return (
        <div className={`ui-empty-state tone-${tone}`}>
            {Icon && <Icon size={26} className="ui-empty-icon" aria-hidden="true" />}
            {title && <h3 className="ui-empty-title">{title}</h3>}
            {description && <p className="ui-empty-desc">{description}</p>}
            {action}
        </div>
    );
};

export default EmptyState;
