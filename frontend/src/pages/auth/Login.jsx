import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    ArrowRight,
    Bot,
    Eye,
    EyeOff,
    Lock,
    Mail,
    ShieldCheck,
} from "lucide-react";
import { authApi } from "../../api";
import { getSessionUser } from "../../components/common/utils/session";
import { useToast } from "../../context/ToastContext";
import BrandLogo from "../../components/common/logo/BrandLogo";
import AuthDecor from "./AuthDecor";
import { useShowcaseEntrance } from "./motionPrefs";
import { useRef } from "react";
import "./Auth.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const { showToast } = useToast();
    const showcaseRef = useRef(null);
    useShowcaseEntrance(showcaseRef);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password");
            showToast("Please enter your email and password", "error");
            return;
        }

        try {
            setLoading(true);
            const response = await authApi.login({ email: email.trim(), password });

            // Trích xuất dữ liệu (hỗ trợ cả dạng ApiResponse envelope bọc ngoài hoặc data trực tiếp)
            const authData = response.data || response;
            const token = authData.accessToken || authData.token;
            const user = authData.user;
            const role = user?.role || authData.role;

            // Lưu phiên đăng nhập và token
            localStorage.setItem("rag_session", JSON.stringify(authData));
            if (token) {
                localStorage.setItem("token", token);
            }

            // Bắn toast thành công (sẽ tiếp tục hiển thị khi điều hướng sang trang kế tiếp)
            showToast(
                `Welcome back${user?.name ? `, ${user.name}` : ""}! Login successful`,
                "success",
            );

            // Phân quyền điều hướng
            if (role === "ADMIN") {
                navigate("/admin");
            } else {
                navigate("/overview");
            }
        } catch (err) {
            const errorMsg =
                err.message || "Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin!";
            setError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">
            <div className="auth-showcase" ref={showcaseRef}>
                <AuthDecor />
                <BrandLogo size="md" title="Prism Studio" onClick={() => navigate(getSessionUser().id ? "/overview" : "/landing")} />
                <div className="showcase-copy" data-animate>
                    <p className="auth-eyebrow">YOUR KNOWLEDGE, IN CONTEXT</p>
                    <h1>
                        Turn documents
                        <br />
                        into <em>clear answers.</em>
                    </h1>
                    <p>
                        One focused workspace for asking questions, exploring ideas, and building
                        with your knowledge.
                    </p>
                </div>
                <div className="showcase-footer" data-animate>
                    <span>
                        <ShieldCheck size={14} /> Private by design
                    </span>
                    <span>Built for focused work</span>
                </div>
            </div>

            <div className="auth-panel">
                <div className="auth-panel-inner animate-fade-in">
                    <div className="auth-header">
                        <div className="logo-icon-auth">
                            <Bot size={24} />
                        </div>
                        <p className="auth-eyebrow">WELCOME BACK</p>
                        <h2>Sign in to your workspace</h2>
                        <p>Continue where you left off.</p>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <form className="auth-form" onSubmit={handleLogin} noValidate>
                        <div className="form-group-auth">
                            <label>Email Address</label>
                            <div className="input-with-icon">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    disabled={loading}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group-auth">
                            <div className="field-label-row">
                                <label>Password</label>
                                <button type="button" className="forgot-link">
                                    Forgot password?
                                </button>
                            </div>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    disabled={loading}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="auth-submit" disabled={loading}>
                            {loading ? (
                                "Signing in..."
                            ) : (
                                <>
                                    Sign in <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Don't have an account? <Link to="/register">Create one</Link>
                        </p>
                        <button
                            type="button"
                            className="landing-preview-btn"
                            onClick={() => navigate("/landing")}
                            title="See what Prism Studio looks like before signing up"
                        >
                            <Eye size={13} /> View landing page
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
