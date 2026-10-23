export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:8080/api";

export const FASTAPI_BASE_URL =
    import.meta.env.VITE_FASTAPI_URL || "http://localhost:8000/api";
