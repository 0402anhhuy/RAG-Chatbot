import { Search } from "lucide-react";
import "./SearchPill.css";

/** Ô tìm kiếm dạng pill dùng chung cho các thanh filter (Tasks/Projects/Conversations…). */
const SearchPill = ({
    value,
    onChange,
    placeholder = "Search...",
    width,
    autoFocus = false,
    onClear,
}) => {
    return (
        <label className="ui-search-pill" style={width ? { width } : undefined}>
            <Search size={14} className="ui-search-glyph" aria-hidden="true" />
            <input
                type="search"
                value={value}
                placeholder={placeholder}
                autoFocus={autoFocus}
                onChange={(event) => onChange?.(event.target.value)}
            />
            {onClear && value ? (
                <button
                    type="button"
                    className="ui-search-clear"
                    onClick={() => onChange?.("")}
                    aria-label="Clear search"
                >
                    ×
                </button>
            ) : null}
        </label>
    );
};

export default SearchPill;
