import { request } from "./client";

export const authApi = {
    login: (credentials) =>
        request("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials),
        }),

    register: (userData) =>
        request("/auth/register", {
            method: "POST",
            body: JSON.stringify(userData),
        }),

    sendOtp: (email) =>
        request("/auth/send-otp", {
            method: "POST",
            body: JSON.stringify({ email }),
        }),

    verifyOtp: (email, otp) =>
        request("/auth/verify-otp", {
            method: "POST",
            body: JSON.stringify({ email, otp }),
        }),
};
