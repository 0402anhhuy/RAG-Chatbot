import { ToastProvider } from "./ToastContext";

export const AppProviders = ({ children }) => {
    return <ToastProvider>{children}</ToastProvider>;
};
