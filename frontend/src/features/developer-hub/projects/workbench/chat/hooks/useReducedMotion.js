import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const readPreference = () =>
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.(QUERY)?.matches);

/**
 * Theo dõi prefers-reduced-motion.
 * Dùng cho cả CSS (animation) lẫn JS (beam) để chỉ có MỘT nguồn sự thật:
 * tắt hạt bay + ring xoay, vẫn giữ nguyên trạng thái hiển thị.
 */
export const useReducedMotion = () => {
    const [reduced, setReduced] = useState(readPreference);

    useEffect(() => {
        const media = window.matchMedia?.(QUERY);
        if (!media) return undefined;
        const onChange = (event) => setReduced(event.matches);
        setReduced(media.matches);
        if (media.addEventListener) media.addEventListener("change", onChange);
        else media.addListener(onChange);
        return () => {
            if (media.removeEventListener)
                media.removeEventListener("change", onChange);
            else media.removeListener(onChange);
        };
    }, []);

    return reduced;
};

export default useReducedMotion;
