import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Nạp dữ liệu bất đồng bộ với loading/error/reload — thay cho khối
 * `useCallback(load, signal) + useEffect + { cancelled: false }` bị copy
 * ở hơn 20 tab.
 *
 * Có 2 cách dùng:
 *  1. Đơn giản:  const { data, loading, error, reload } = useAsyncData(loader, deps)
 *  2. Nhiều state đích: dùng `onSuccess` để tự phân phối dữ liệu
 *     useAsyncData(loader, deps, { onSuccess: (d) => { setA(d.a); setB(d.b); } })
 *
 * @param {() => Promise<any>} loader
 * @param {Array} deps
 * @param {{ initialData?: any, enabled?: boolean, debounceMs?: number,
 *           errorMessage?: string, onSuccess?: Function, onError?: Function }} options
 */
export function useAsyncData(loader, deps = [], options = {}) {
    const {
        initialData = null,
        enabled = true,
        debounceMs = 0,
        errorMessage,
        onSuccess,
        onError,
    } = options;

    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    // Giữ callback mới nhất để không phải đưa vào dependency array.
    const loaderRef = useRef(loader);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    loaderRef.current = loader;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return undefined;
        }

        let active = true;

        const run = async () => {
            setLoading(true);
            setError("");
            try {
                const result = await loaderRef.current();
                if (!active) return;
                setData(result);
                onSuccessRef.current?.(result);
            } catch (err) {
                if (!active) return;
                const message = err?.message || errorMessage || "Something went wrong.";
                setError(message);
                onErrorRef.current?.(err, message);
            } finally {
                if (active) setLoading(false);
            }
        };

        if (debounceMs > 0) {
            const timer = setTimeout(run, debounceMs);
            return () => {
                active = false;
                clearTimeout(timer);
            };
        }

        run();
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, refreshKey, enabled, debounceMs, errorMessage]);

    const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

    return { data, setData, loading, error, reload };
}
