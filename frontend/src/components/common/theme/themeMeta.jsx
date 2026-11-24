import { Flower2, Moon, Sun } from "lucide-react";

/** Thứ tự theme + metadata hiển thị (icon = theme tương ứng). */
export const THEMES = ["light", "dark", "pink"];

export const THEME_META = {
    light: { icon: Sun, name: "Light", title: "Light Theme" },
    dark: { icon: Moon, name: "Dark", title: "Dark Theme" },
    pink: { icon: Flower2, name: "Blush", title: "Blush Theme" },
};

export const themeMeta = (theme) => THEME_META[theme] ?? THEME_META.light;

/** Theme kế tiếp trong chu kỳ (dùng cho nút kiểu toggle nhanh). */
export const getNextTheme = (theme) => {
    const index = THEMES.indexOf(theme);
    return THEMES[(index + 1) % THEMES.length];
};
