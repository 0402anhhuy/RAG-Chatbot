import { ToastProvider } from "./ToastContext";
import { ThemeProvider } from "./ThemeContext";

export const AppProviders = ({ children }) => {
    return (
        <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
    );
};
