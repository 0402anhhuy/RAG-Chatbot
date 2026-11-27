import { ToastProvider } from "@/context/ToastContext.jsx";
import { ThemeProvider } from "@/context/ThemeContext.jsx";

export const AppProviders = ({ children }) => {
    return (
        <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
    );
};
