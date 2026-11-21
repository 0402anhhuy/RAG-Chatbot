import { request } from "./client";

// Tuỳ chọn tab Settings của Academy Hub (hồ sơ sinh viên, AI Tutor, mục tiêu học
// tập, nhắc nhở). Mọi giá trị đều do BE trả về; lần đầu chưa lưu thì BE trả mặc
// định kèm saved = false.
export const academySettingApi = {
    get: (userId) => request(`/users/${userId}/academy-settings`),

    // Form settings là một khối duy nhất nên lưu bằng PUT (ghi đè toàn bộ).
    update: (userId, settings) =>
        request(`/users/${userId}/academy-settings`, {
            method: "PUT",
            body: JSON.stringify(settings),
        }),
};
