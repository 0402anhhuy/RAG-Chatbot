import { useState } from "react";
import { ChevronDown, Menu, Search } from "lucide-react";
import ThemePicker from "@/components/theme/ThemePicker.jsx";
import "./SidebarRail.css";

/**
 * Rail điều hướng dùng chung cho mọi hub (Developer Hub, Academy Hub, Project,
 * Workbench). Trước đây mỗi khu vực có một bản sidebar riêng (~1.300 dòng CSS
 * trùng nhau) — giờ chỉ còn cấu hình `items` khác nhau.
 *
 * @param {Array}  items        [{ id, label, icon }]
 * @param {string} activeId
 * @param {Function} onSelect
 * @param {boolean} collapsed
 * @param {Function} onToggleCollapse
 * @param {Function} onSearch
 * @param {string} searchLabel
 * @param {object} submenu      { parentId, items, activeId, onSelect }
 */
const SidebarRail = ({
    items = [],
    activeId,
    onSelect,
    collapsed = false,
    onToggleCollapse,
    onSearch,
    searchLabel = "Search",
    profileName = "",
    profileSubtitle = "v1.0.0-rc-50-min",
    onProfileClick,
    accent = "default",
    submenu = null,
}) => {
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(true);

    const handleItemClick = (item) => {
        if (!submenu || item.id !== submenu.parentId) {
            onSelect?.(item.id);
            return;
        }

        if (collapsed) {
            onToggleCollapse?.();
            setIsSubmenuOpen(true);
            onSelect?.(item.id);
            return;
        }

        if (activeId === submenu.parentId) {
            setIsSubmenuOpen((prev) => !prev);
        } else {
            onSelect?.(item.id);
            setIsSubmenuOpen(true);
        }
    };

    const initials = (profileName || "HT").trim().slice(0, 2).toUpperCase();

    return (
        <aside className={`ui-rail accent-${accent} ${collapsed ? "is-collapsed" : ""}`}>
            <div className="ui-rail-brand">
                <button
                    type="button"
                    className="ui-rail-toggle"
                    onClick={onToggleCollapse}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <Menu size={16} />
                    {!collapsed && <span>MENU</span>}
                </button>
            </div>

            {onSearch && (
                <button
                    type="button"
                    className={collapsed ? "ui-rail-search-mini" : "ui-rail-search"}
                    onClick={onSearch}
                    title={collapsed ? "Search (Ctrl+K)" : undefined}
                >
                    <Search size={collapsed ? 15 : 14} />
                    {!collapsed && (
                        <>
                            <span>{searchLabel}</span>
                            <kbd>Ctrl+K</kbd>
                        </>
                    )}
                </button>
            )}

            <nav className="ui-rail-nav">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeId === item.id;
                    const hasSubmenu = Boolean(submenu) && item.id === submenu.parentId;
                    const showSubmenu = hasSubmenu && !collapsed && isSubmenuOpen;

                    return (
                        <div key={item.id} className="ui-rail-item-wrap">
                            <button
                                type="button"
                                className={`ui-rail-item ${isActive ? "active" : ""}`}
                                onClick={() => handleItemClick(item)}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon size={16} className="ui-rail-glyph" />
                                {!collapsed && <span>{item.label}</span>}
                                {hasSubmenu && !collapsed && (
                                    <ChevronDown
                                        size={13}
                                        className={`ui-rail-caret ${showSubmenu ? "open" : ""}`}
                                    />
                                )}
                            </button>

                            {showSubmenu && (
                                <div className="ui-rail-submenu">
                                    {submenu.items.map((sub) => {
                                        const SubIcon = sub.icon;
                                        const isSubActive = submenu.activeId === sub.id;
                                        return (
                                            <button
                                                key={sub.id}
                                                type="button"
                                                className={`ui-rail-subitem ${isSubActive ? "active" : ""}`}
                                                onClick={() => submenu.onSelect?.(sub.id)}
                                            >
                                                <SubIcon size={13} />
                                                <span>{sub.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="ui-rail-footer">
                <ThemePicker
                    direction="up"
                    showLabel={!collapsed}
                    iconSize={14}
                    triggerClassName="ui-rail-footer-row"
                />

                <button
                    type="button"
                    className="ui-rail-profile"
                    onClick={onProfileClick}
                    title={onProfileClick ? "Return to hub" : undefined}
                >
                    <span className="ui-rail-avatar">{initials}</span>
                    {!collapsed && (
                        <span className="ui-rail-user">
                            <strong>{profileName || "Guest"}</strong>
                            <small>{profileSubtitle}</small>
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
};

export default SidebarRail;
