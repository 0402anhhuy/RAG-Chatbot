import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getNextTheme, THEMES } from "@/components/theme/themeMeta.jsx";

const STORAGE_KEY = "prism-theme";

const resolveInitialTheme = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (THEMES.includes(stored)) return stored;
    } catch {
        /* storage unavailable */
    }
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
};

const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} });

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(resolveInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = theme;
        // "pink" là theme sáng — báo browser dùng scrollbar/form kiểu light
        root.style.colorScheme = theme === "dark" ? "dark" : "light";
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* storage unavailable */
        }
    }, [theme]);

    // Follow OS change while the user has not picked a theme explicitly
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e) => {
            try {
                if (localStorage.getItem(STORAGE_KEY)) return;
            } catch {
                /* storage unavailable */
            }
            setTheme(e.matches ? "dark" : "light");
        };
        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);

    const toggleTheme = useCallback(() => {
        const root = document.documentElement;
        if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            root.classList.add("theme-switching");
            window.setTimeout(() => root.classList.remove("theme-switching"), 320);
        }
        setTheme((prev) => getNextTheme(prev));
    }, []);

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme, toggleTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
