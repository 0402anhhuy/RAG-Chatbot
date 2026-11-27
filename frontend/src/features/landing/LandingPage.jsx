import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Bot,
    ChevronDown,
    Code2,
    FileText,
    FolderKanban,
    GraduationCap,
    Layers,
    PenTool,
    ShieldCheck,
    Sparkles,
    Upload,
    Wrench,
} from "lucide-react";
import BrandLogo from "@/components/logo/BrandLogo.jsx";
import ThemePicker from "@/components/theme/ThemePicker.jsx";
import { MockDiffPanel, MockQuizPanel } from "@/features/landing/mockPanels.jsx";
import HeroCircuit from "@/features/landing/HeroCircuit.jsx";
import KnowledgeField from "@/components/three/KnowledgeField.jsx";
import {
    useLandingAmbient,
    useLandingEntrance,
    useLenisScroll,
    usePointerMicroInteractions,
    useRevealOnScroll,
    useScrollStorytelling,
} from "@/features/landing/landingMotion.js";
import "@/features/landing/landing.css";

const NAV_LINKS = [
    { href: "#hubs", label: "Hubs" },
    { href: "#features", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#faq", label: "FAQ" },
];

const FEATURES = [
    {
        icon: Bot,
        title: "AI answers with sources",
        description:
            "Ask across your PDFs, specs and notes. Every answer cites the documents it came from.",
    },
    {
        icon: Upload,
        title: "Knowledge base",
        description:
            "Drop in PDF, DOCX or Markdown. Files are chunked, embedded and kept searchable.",
    },
    {
        icon: PenTool,
        title: "Architecture canvas",
        description:
            "Sketch services and dependencies on an infinite canvas, then reason about the graph.",
    },
    {
        icon: Code2,
        title: "Source code review",
        description:
            "Static inspection for injection, leaks and design smells — with findings you can act on.",
    },
    {
        icon: GraduationCap,
        title: "Study toolkit",
        description:
            "Summaries, flashcards, quizzes and mind maps generated straight from your courseware.",
    },
    {
        icon: Wrench,
        title: "AI workbench",
        description:
            "Create, edit and organize project files while agents work alongside you.",
    },
    {
        icon: FolderKanban,
        title: "Tasks & kanban",
        description:
            "Track work per project with boards, priorities and completion analytics.",
    },
    {
        icon: BarChart3,
        title: "Usage insights",
        description:
            "See token spend, cost per provider and lines of code the AI touched.",
    },
    {
        icon: ShieldCheck,
        title: "Admin console",
        description:
            "Role-based access, member management and platform-wide activity at a glance.",
    },
];

const STEPS = [
    {
        title: "Connect your sources",
        description:
            "Upload documents or point Prism at a course. The knowledge base indexes everything in seconds.",
    },
    {
        title: "Ask anything",
        description:
            "Question a spec, review a diff or trace an architecture decision — answers cite their sources.",
    },
    {
        title: "Study with AI",
        description:
            "Turn the same material into flashcards, quizzes and mind maps tailored to what you missed.",
    },
    {
        title: "Ship with confidence",
        description:
            "Track tasks, watch AI usage and keep every project's knowledge in one place.",
    },
];

const FAQS = [
    {
        q: "Do I need to bring my own AI key?",
        a: "Prism Studio ships with platform credits to start. You can also connect your own provider key (OpenAI, Gemini, Claude…) in project settings whenever you want full control over cost and model choice.",
    },
    {
        q: "Which file types can I upload?",
        a: "PDF, DOCX and Markdown today. PDFs are parsed with their structure intact, so tables and headings survive into search and citations.",
    },
    {
        q: "How are my documents kept private?",
        a: "Your workspace is isolated: documents, embeddings and chat history belong to your account only, and code review runs as static analysis on files you explicitly add to a project.",
    },
    {
        q: "What is the difference between the two hubs?",
        a: "Developer Hub focuses on code: review, architecture canvas and knowledge assistant. Academy Hub focuses on learning: tutoring, exam prep, grading and courseware search. Both share the same knowledge base.",
    },
    {
        q: "Can I work with a team?",
        a: "Yes. Projects support members with roles, shared boards and per-project analytics. Admins get a console for members, roles and platform activity.",
    },
];

const StatBand = () => (
    <div className="landing-stat-band" aria-label="Platform at a glance">
        <div className="stat-band-item">
            <strong data-count="7">7</strong>
            <span>AI tools across two hubs</span>
        </div>
        <i className="stat-divider" />
        <div className="stat-band-item">
            <strong>PDF · DOCX · MD</strong>
            <span>indexed with sources</span>
        </div>
        <i className="stat-divider" />
        <div className="stat-band-item">
            <strong data-count="100" data-suffix="%">100%</strong>
            <span>your workspace, private by design</span>
        </div>
    </div>
);

const Hero = () => (
    <section className="landing-hero" id="top">
        <div className="hero-aurora" aria-hidden="true">
            <span className="aurora aurora-a" />
            <span className="aurora aurora-b" />
        </div>
        <div className="landing-container hero-grid">
            <div className="hero-copy">
                <span className="landing-eyebrow" data-hero-animate>
                    <Sparkles size={12} /> Prism Studio · AI knowledge workspace
                </span>
                <h1 data-hero-animate data-hero-words>
                    Turn documents into{" "}
                    <span className="gradient-text">clear answers.</span>
                </h1>
                <p className="hero-sub" data-hero-animate>
                    One focused workspace where your PDFs, specs and coursework
                    answer questions with sources — and where AI reviews code,
                    sketches architecture and builds your next quiz.
                </p>
                <div className="hero-cta-row" data-hero-animate>
                    <Link to="/register" className="btn-landing-primary" data-magnetic>
                        Create free account <ArrowRight size={15} />
                    </Link>
                    <Link to="/login" className="btn-landing-ghost" data-magnetic>
                        Sign in
                    </Link>
                </div>
                <div className="hero-proof" data-hero-animate>
                    <ShieldCheck size={13} /> Private by design · dark &amp; light
                    themes
                </div>
            </div>
        </div>
        <HeroCircuit />
    </section>
);

const StatBandSection = () => (
    <section className="landing-statband-row">
        <div className="landing-container">
            <StatBand />
        </div>
    </section>
);

const HubRow = ({ reverse, reveal, icon: Icon, badge, title, copy, points, mock }) => (
    <article className={`hub-row ${reverse ? "reverse" : ""}`}>
        <div className="hub-row-copy" data-reveal={reveal ? "" : undefined}>
            <span className="landing-eyebrow hub-eyebrow">
                <Icon size={12} /> {badge}
            </span>
            <h3>{title}</h3>
            <p>{copy}</p>
            <ul className="hub-points">
                {points.map((p) => (
                    <li key={p}>
                        <Layers size={12} /> {p}
                    </li>
                ))}
            </ul>
        </div>
        <div className="hub-row-visual" data-reveal={reveal ? "" : undefined} data-tilt>
            <div className="panel-stack">{mock}</div>
        </div>
    </article>
);

const FAQItem = ({ q, a, open, onToggle }) => (
    <div className={`faq-item ${open ? "open" : ""}`}>
        <button type="button" className="faq-trigger" onClick={onToggle} aria-expanded={open}>
            {q}
            <ChevronDown size={16} className="faq-chevron" />
        </button>
        <div className="faq-body" role="region">
            <p>{a}</p>
        </div>
    </div>
);

const LandingPage = () => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);
    const pageRef = useRef(null);
    useLenisScroll(pageRef);
    useLandingAmbient(pageRef);
    useLandingEntrance(pageRef);
    useScrollStorytelling(pageRef);
    usePointerMicroInteractions(pageRef);
    useRevealOnScroll(pageRef);

    const goToAuth = (path) => {
        setMenuOpen(false);
        navigate(path);
    };

    return (
        <div className="landing-page" ref={pageRef}>
            <div className="landing-bg-field" aria-hidden="true">
                <KnowledgeField />
            </div>
            <header className="landing-navbar">
                <div className="landing-container nav-inner">
                    <BrandLogo size="sm" onClick={() => navigate("/")} />
                    <nav className="nav-links" aria-label="Main">
                        {NAV_LINKS.map((l) => (
                            <a key={l.href} href={l.href}>
                                {l.label}
                            </a>
                        ))}
                    </nav>
                    <div className="nav-actions">
                        <ThemePicker
                            direction="down"
                            align="right"
                            iconSize={15}
                            triggerClassName="nav-theme-btn"
                        />
                        <button type="button" className="nav-signin" onClick={() => goToAuth("/login")}>
                            Sign in
                        </button>
                        <button
                            type="button"
                            className="btn-landing-primary nav-cta"
                            data-magnetic
                            onClick={() => goToAuth("/register")}
                        >
                            Get started
                        </button>
                        <button
                            type="button"
                            className="nav-burger"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-label="Open menu"
                            aria-expanded={menuOpen}
                        >
                            <Layers size={16} />
                        </button>
                    </div>
                </div>
                {menuOpen && (
                    <div className="nav-mobile">
                        {NAV_LINKS.map((l) => (
                            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
                                {l.label}
                            </a>
                        ))}
                        <button type="button" onClick={() => goToAuth("/login")}>Sign in</button>
                        <button type="button" className="mobile-cta" onClick={() => goToAuth("/register")}>
                            Get started
                        </button>
                    </div>
                )}
            </header>

            <Hero />

            <StatBandSection />

            {/* Hubs showcase — mock panels đổi màu theo theme */}
            <section className="landing-section" id="hubs">
                <div className="landing-container">
                    <header className="section-head">
                        <span className="landing-eyebrow">TWO HUBS, ONE KNOWLEDGE BASE</span>
                        <h2>
                            Built for <span className="gradient-text">building</span> and{" "}
                            <span className="gradient-text">learning</span>
                        </h2>
                        <p>
                            The same indexed documents power engineering inspection and
                            interactive study — pick the hub that matches the task.
                        </p>
                    </header>

                    <HubRow
                        reveal
                        icon={Code2}
                        badge="DEVELOPER HUB"
                        title="Inspect code and architecture with context"
                        copy="Point review at a project and Prism reads the sources you connected — findings come with the reasoning, not just line numbers."
                        points={[
                            "Static review for SQLi, XSS, leaks and smells",
                            "Architecture canvas that maps dependencies",
                            "Answers grounded in your specs and RFCs",
                        ]}
                        mock={<MockDiffPanel />}
                    />
                    <HubRow
                        reverse
                        reveal
                        icon={BookOpen}
                        badge="ACADEMY HUB"
                        title="Turn courseware into active recall"
                        copy="Lectures and syllabi become flashcards, quizzes and mind maps — and the tutor knows exactly which concepts you keep missing."
                        points={[
                            "Flashcards and quizzes generated per document",
                            "Mastery tracking across attempts",
                            "Mind maps and summaries on demand",
                        ]}
                        mock={<MockQuizPanel />}
                    />
                </div>
            </section>

            {/* Feature grid */}
            <section className="landing-section" id="features">
                <div className="landing-container">
                    <header className="section-head">
                        <span className="landing-eyebrow">EVERYTHING IN THE BOX</span>
                        <h2>
                            One workspace,{" "}
                            <span className="gradient-text">nine superpowers</span>
                        </h2>
                    </header>
                    <div className="feature-grid">
                        {FEATURES.map((f) => {
                            const Icon = f.icon;
                            return (
                                <article key={f.title} className="feature-card" data-batch-reveal>
                                    <span className="feature-icon">
                                        <Icon size={16} />
                                    </span>
                                    <h3>{f.title}</h3>
                                    <p>{f.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How it works — đúng một chuỗi thật nên có số thứ tự */}
            <section className="landing-section" id="how">
                <div className="landing-container">
                    <header className="section-head">
                        <span className="landing-eyebrow">FROM FILES TO FIRST ANSWER</span>
                        <h2>How it works</h2>
                    </header>
                    <ol className="steps-grid">
                        {STEPS.map((s, i) => (
                            <li key={s.title} className="step-card" data-batch-reveal>
                                <span className="step-number">0{i + 1}</span>
                                <h3>{s.title}</h3>
                                <p>{s.description}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* FAQ */}
            <section className="landing-section" id="faq">
                <div className="landing-container landing-narrow">
                    <header className="section-head">
                        <span className="landing-eyebrow">GOOD TO KNOW</span>
                        <h2>Questions, answered</h2>
                    </header>
                    <div className="faq-list" data-reveal>
                        {FAQS.map((f, i) => (
                            <FAQItem
                                key={f.q}
                                q={f.q}
                                a={f.a}
                                open={openFaq === i}
                                onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="landing-section">
                <div className="landing-container">
                    <div className="cta-band" data-reveal>
                        <div className="cta-aurora" aria-hidden="true" />
                        <FileText size={18} className="cta-glyph" aria-hidden="true" />
                        <h2>Bring your documents. Leave with answers.</h2>
                        <p>Free to start — your first project takes about a minute.</p>
                        <div className="hero-cta-row center">
                            <Link to="/register" className="btn-landing-primary" data-magnetic>
                                Create free account <ArrowRight size={15} />
                            </Link>
                            <Link to="/login" className="btn-landing-ghost" data-magnetic>
                                I already have one
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="landing-container footer-inner">
                    <BrandLogo size="sm" />
                    <p>
                        <ShieldCheck size={12} /> Private by design — built for focused work
                    </p>
                    <nav className="footer-links" aria-label="Footer">
                        <a href="#hubs">Hubs</a>
                        <a href="#features">Features</a>
                        <a href="#faq">FAQ</a>
                    </nav>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
