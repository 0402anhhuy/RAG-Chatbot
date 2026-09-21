import { Check, Cpu, Key, Shield } from "lucide-react";
import "./Setting.css";

const Setting = () => {
    return (
        <div className="tab-body-container settings-narrow-wrap">
            <div className="tab-header-banner">
                <h2>User Settings</h2>
                <span>Manage your personal git tokens, AI model providers, and integrations.</span>
            </div>

            {/* Starter Kit Usage */}
            <div className="settings-section-card">
                <div className="settings-section-header">
                    <div className="header-meta-wrap">
                        <strong>Prism Developer Kit Usage</strong>
                        <small>Spend on developer starter models · Resets 9/30/2026</small>
                    </div>
                    <span className="spend-number">$1.96 / $50.00 (4%)</span>
                </div>
                <div className="spend-progress-bar">
                    <div className="spend-bar-fill" style={{ width: "4%" }} />
                </div>
            </div>

            {/* LLM Providers */}
            <div className="settings-section-card">
                <div className="providers-title-row">
                    <Cpu size={16} />
                    <strong>LLM Providers</strong>
                </div>
                <p className="providers-lead-text">
                    Connect personal LLM providers. Models will appear in the "Personal" section of
                    the model picker.
                </p>

                <div className="provider-input-item">
                    <div className="provider-name-line">
                        <strong>FPT Smart Cloud</strong>
                        <span className="provider-tag">Your key</span>
                    </div>
                    <div className="provider-input-group">
                        <input type="password" value="sk-fpt-live-0982348" readOnly />
                        <select defaultValue="mkp-api.fptcloud.com">
                            <option value="mkp-api.fptcloud.com">
                                FPT Cloud VN (mkp-api.fptcloud.com)
                            </option>
                        </select>
                    </div>
                    <button type="button" className="btn-connect-provider">
                        Connected
                    </button>
                </div>

                <div className="provider-input-item">
                    <div className="provider-name-line">
                        <strong>OpenAI</strong>
                    </div>
                    <button type="button" className="btn-connect-provider outlined">
                        Connect OpenAI
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Setting;
