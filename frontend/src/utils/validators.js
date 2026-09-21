export const validatePhone = (phone) => {
    // Cho phép để trống
    if (!phone || !phone.trim()) {
        return "";
    }
    // Nếu có nhập thì kiểm tra đúng định dạng số điện thoại Việt Nam
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone.trim())) {
        return "Please enter a valid phone number";
    }
    return "";
};

export const validateEmail = (email) => {
    if (!email || !email.trim()) {
        return "Email address is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return "Please enter a valid email address";
    }
    return "";
};

export const validatePassword = (password) => {
    if (!password) {
        return "Password is required";
    }
    if (password.length < 8) {
        return "Password must be at least 8 characters";
    }
    return "";
};

export const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) {
        return "Please confirm your password";
    }
    if (password !== confirmPassword) {
        return "Passwords do not match";
    }
    return "";
};
