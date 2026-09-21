import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Eye,
    EyeOff,
    Lock,
    Mail,
    Phone,
    ShieldCheck,
    Sparkles,
    User,
    UserPlus,
    Bot,
} from "lucide-react";
import { authApi } from "../../api";
import { useToast } from "../../context/ToastContext";
import BrandLogo from "../../components/common/logo/BrandLogo";
import {
    validatePhone,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
} from "../../utils/validators";
import "./Auth.css";

const Register = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [step, setStep] = useState(1);

    // Step 1 Form States
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");

    // Step 2 Form States
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Control States
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isOtpSending, setIsOtpSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleSendOtp = async () => {
        const emailErr = validateEmail(email);
        if (emailErr) {
            setErrors((prev) => ({ ...prev, email: emailErr }));
            showToast(emailErr, "error");
            return;
        }

        try {
            setIsOtpSending(true);
            await authApi.sendOtp(email.trim());
            setIsOtpSent(true);
            showToast("Verification code sent to your email.", "success");
        } catch (err) {
            showToast(err.message || "Failed to transmit OTP", "error");
        } finally {
            setIsOtpSending(false);
        }
    };

    const handleStep1Submit = (e) => {
        if (e) e.preventDefault();
        const formErrors = {};

        if (!name.trim()) {
            formErrors.name = "Full name is required";
        }

        const phoneErr = validatePhone(phone);
        if (phoneErr) {
            formErrors.phone = phoneErr;
        }

        const emailErr = validateEmail(email);
        if (emailErr) {
            formErrors.email = emailErr;
        } else {
            if (!isOtpSent) {
                formErrors.otp = "Please send and verify the code first";
            } else if (!otp.trim()) {
                formErrors.otp = "Verification code is required";
            }
        }

        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            const firstErr = Object.values(formErrors)[0];
            showToast(firstErr, "error");
            return;
        }

        verifyAndProceed();
    };

    const verifyAndProceed = async () => {
        try {
            setLoading(true);
            await authApi.verifyOtp(email.trim(), otp.trim());
            showToast("Email verified successfully.", "success");
            setErrors({});
            setStep(2);
        } catch (err) {
            setErrors((prev) => ({
                ...prev,
                otp: "Invalid or expired verification code",
            }));
            showToast(err.message || "Invalid or expired verification code", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleStep2Submit = async (e) => {
        e.preventDefault();

        const passErr = validatePassword(password);
        const confirmErr = validateConfirmPassword(password, confirmPassword);

        if (passErr || confirmErr) {
            setErrors({ password: passErr, confirmPassword: confirmErr });
            return;
        }

        try {
            setLoading(true);
            await authApi.register({
                name: name.trim(),
                phone: phone.trim() ? phone.trim() : null,
                email: email.trim(),
                password,
                role: "USER",
            });

            showToast("Account registered successfully. Please sign in.", "success");
            navigate("/login");
        } catch (err) {
            showToast(err.message || "Registration encountered an error", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">
            {/* Left Column Showcase Viewport */}
            <div className="auth-showcase">
                <BrandLogo size="md" title="Prism Studio" onClick={() => navigate("/overview")} />
                <div className="showcase-copy">
                    <p className="auth-eyebrow">DEVELOPER ONBOARDING</p>
                    <h1>
                        Equip your team
                        <br />
                        with <em>intelligent context.</em>
                    </h1>
                    <p>
                        A unified platform to inspect source code, query technical documentation,
                        and accelerate architecture reviews.
                    </p>
                </div>

                <div className="showcase-preview">
                    <div className="preview-top">
                        <span>
                            <ShieldCheck size={14} color="#0284c7" /> Identity Verification
                        </span>
                        <span className="preview-dot">Secure Step</span>
                    </div>
                    <div className="preview-message">
                        Complete your profile verification to connect your repositories.
                    </div>
                    <div className="preview-answer">
                        <span className="answer-icon">
                            <Sparkles size={14} />
                        </span>
                        <span>Multi-tenant workspace ready for deployment.</span>
                    </div>
                    <div className="preview-source">
                        <Check size={11} /> Enterprise security standards compliant
                    </div>
                </div>

                <div className="showcase-footer">
                    <span>
                        <ShieldCheck size={14} /> Private and isolated
                    </span>
                    <span>Designed for production software</span>
                </div>
            </div>

            {/* Right Column Registration Form Panel */}
            <div className="auth-panel">
                <div className="auth-panel-inner animate-fade-in">
                    <div className="auth-header">
                        <div className="logo-icon-auth">
                            <Bot size={24} />
                        </div>
                        <p className="auth-eyebrow">GET STARTED</p>
                        <h2>Create your developer account</h2>
                        <p>Join the unified engineering workspace.</p>

                        {/* Modern Stepper Indicator */}
                        <div className="stepper-indicator">
                            <div className={`step-item ${step >= 1 ? "active" : ""}`}>
                                <div className="step-circle">1</div>
                                <span className="step-label">Verification</span>
                            </div>

                            <div className={`step-connector ${step >= 2 ? "active" : ""}`} />

                            <div className={`step-item ${step >= 2 ? "active" : ""}`}>
                                <div className="step-circle">2</div>
                                <span className="step-label">Credentials</span>
                            </div>
                        </div>
                    </div>

                    {step === 1 && (
                        <form className="auth-form" onSubmit={handleStep1Submit} noValidate>
                            <div className="form-group-auth">
                                <label>Full Name</label>
                                <div
                                    className={`input-with-icon ${errors.name ? "input-error" : ""}`}
                                >
                                    <User size={16} className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="e.g. Alex Morgan"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (errors.name) {
                                                setErrors((prev) => ({ ...prev, name: "" }));
                                            }
                                        }}
                                    />
                                </div>
                                {errors.name && (
                                    <span className="field-error-text">{errors.name}</span>
                                )}
                            </div>

                            <div className="form-group-auth">
                                <div className="field-label-row">
                                    <label>Phone Number</label>
                                    <span className="label-optional-cue">(Optional)</span>
                                </div>
                                <div
                                    className={`input-with-icon ${errors.phone ? "input-error" : ""}`}
                                >
                                    <Phone size={16} className="input-icon" />
                                    <input
                                        type="tel"
                                        placeholder="+1 (555) 019-2834"
                                        value={phone}
                                        onChange={(e) => {
                                            setPhone(e.target.value);
                                            if (errors.phone) {
                                                setErrors((prev) => ({ ...prev, phone: "" }));
                                            }
                                        }}
                                    />
                                </div>
                                {errors.phone && (
                                    <span className="field-error-text">{errors.phone}</span>
                                )}
                            </div>

                            <div className="form-group-auth">
                                <label>Work Email</label>
                                <div className="input-with-button-group">
                                    <div
                                        className={`input-with-icon full-width ${errors.email ? "input-error" : ""}`}
                                    >
                                        <Mail size={16} className="input-icon" />
                                        <input
                                            type="email"
                                            placeholder="alex@company.com"
                                            value={email}
                                            disabled={isOtpSent}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (errors.email) {
                                                    setErrors((prev) => ({ ...prev, email: "" }));
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-send-otp"
                                        onClick={handleSendOtp}
                                        disabled={isOtpSending || isOtpSent}
                                    >
                                        {isOtpSending
                                            ? "Sending..."
                                            : isOtpSent
                                              ? "Sent"
                                              : "Send OTP"}
                                    </button>
                                </div>
                                {errors.email && (
                                    <span className="field-error-text">{errors.email}</span>
                                )}
                            </div>

                            {isOtpSent && (
                                <div className="form-group-auth animate-fade-in">
                                    <label>6-Digit Verification Code</label>
                                    <div
                                        className={`input-with-icon ${errors.otp ? "input-error" : ""}`}
                                    >
                                        <ShieldCheck size={16} className="input-icon" />
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="Enter 6-digit OTP code"
                                            value={otp}
                                            onChange={(e) => {
                                                setOtp(e.target.value);
                                                if (errors.otp) {
                                                    setErrors((prev) => ({ ...prev, otp: "" }));
                                                }
                                            }}
                                        />
                                    </div>
                                    {errors.otp && (
                                        <span className="field-error-text">{errors.otp}</span>
                                    )}
                                </div>
                            )}

                            {!isOtpSent && errors.otp && (
                                <span className="field-error-text" style={{ marginTop: "-4px" }}>
                                    {errors.otp}
                                </span>
                            )}

                            <button type="submit" className="auth-submit" disabled={loading}>
                                {loading ? (
                                    "Verifying..."
                                ) : (
                                    <>
                                        Continue <ArrowRight size={15} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form
                            className="auth-form animate-fade-in"
                            onSubmit={handleStep2Submit}
                            noValidate
                        >
                            <div className="form-group-auth">
                                <label>Create Password</label>
                                <div
                                    className={`input-with-icon ${errors.password ? "input-error" : ""}`}
                                >
                                    <Lock size={16} className="input-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Minimum 8 characters"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (errors.password) {
                                                setErrors((prev) => ({ ...prev, password: "" }));
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="field-error-text">{errors.password}</span>
                                )}
                            </div>

                            <div className="form-group-auth">
                                <label>Confirm Password</label>
                                <div
                                    className={`input-with-icon ${errors.confirmPassword ? "input-error" : ""}`}
                                >
                                    <Lock size={16} className="input-icon" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Re-enter your password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (errors.confirmPassword) {
                                                setErrors((prev) => ({
                                                    ...prev,
                                                    confirmPassword: "",
                                                }));
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={15} />
                                        ) : (
                                            <Eye size={15} />
                                        )}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <span className="field-error-text">
                                        {errors.confirmPassword}
                                    </span>
                                )}
                            </div>

                            <div className="stepper-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setStep(1)}
                                    disabled={loading}
                                >
                                    <ArrowLeft size={15} /> Back
                                </button>
                                <button type="submit" className="auth-submit" disabled={loading}>
                                    {loading ? (
                                        "Creating..."
                                    ) : (
                                        <>
                                            Complete Setup <UserPlus size={15} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="auth-footer">
                        <p>
                            Already have an account? <Link to="/login">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
