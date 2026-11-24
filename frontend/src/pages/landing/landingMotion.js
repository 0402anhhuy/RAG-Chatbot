import { useEffect, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const canHover = () =>
    window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/**
 * Ambient cho landing: khối màu aurora trôi + thở (yoyo), CTA aurora xoay
 * nhẹ — tốc độ lệch nhau để chuyển động organic.
 */
export const useLandingAmbient = (scopeRef) => {
    useEffect(() => {
        if (!scopeRef.current || prefersReducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            gsap.to(".aurora-a", {
                x: 46, y: 30, scale: 1.12,
                duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut",
            });
            gsap.to(".aurora-b", {
                x: -42, y: -28, scale: 1.16,
                duration: 11.5, repeat: -1, yoyo: true, ease: "sine.inOut",
            });
            gsap.to(".cta-aurora", {
                rotation: 5, scale: 1.05,
                duration: 8.5, repeat: -1, yoyo: true, ease: "sine.inOut",
                transformOrigin: "50% 50%",
            });
        }, scopeRef);
        return () => ctx.revert();
    }, [scopeRef]);
};

/**
 * Lenis smooth scroll bắt nhịp với ScrollTrigger. Anchor links trong trang
 * (#hubs, #features…) chuyển sang lenis.scrollTo để cuộn mượt có offset navbar.
 */
export const useLenisScroll = (scopeRef) => {
    useEffect(() => {
        if (prefersReducedMotion()) return undefined;

        const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        const raf = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);

        const root = scopeRef.current;
        const onClick = (event) => {
            const anchor = event.target.closest?.('a[href^="#"]');
            if (!anchor || !root?.contains(anchor)) return;
            const target = document.querySelector(anchor.getAttribute("href"));
            if (!target) return;
            event.preventDefault();
            lenis.scrollTo(target, { offset: -72, duration: 1.25 });
        };
        document.addEventListener("click", onClick);

        const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 350);

        return () => {
            window.clearTimeout(refreshId);
            document.removeEventListener("click", onClick);
            gsap.ticker.remove(raf);
            lenis.destroy();
        };
    }, [scopeRef]);
};

/**
 * Tách headline hero thành từng từ, mỗi từ trượt lên từ "mask" (overflow
 * hidden) — chữ như được xếp từng chữ cái máy in, thay vì fade cả khối.
 * Idempotent + có unwrap để an toàn với StrictMode double-mount.
 */
const splitHeroWords = (heading) => {
    if (heading.querySelector(".hero-word")) return [];
    const words = [];
    const wrapText = (text) => {
        const fragment = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (!part.trim()) {
                fragment.appendChild(document.createTextNode(part));
                return;
            }
            const mask = document.createElement("span");
            mask.className = "hero-word-mask";
            const word = document.createElement("span");
            word.className = "hero-word";
            word.textContent = part;
            mask.appendChild(word);
            fragment.appendChild(mask);
            words.push(word);
        });
        return fragment;
    };

    Array.from(heading.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            heading.replaceChild(wrapText(node.textContent), node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const mask = document.createElement("span");
            mask.className = "hero-word-mask";
            node.parentNode.insertBefore(mask, node);
            mask.appendChild(node);
            words.push(node);
        }
    });
    return words;
};

const unwrapHeroWords = (heading) => {
    heading.querySelectorAll(".hero-word-mask").forEach((mask) => {
        const parent = mask.parentNode;
        while (mask.firstChild) parent.insertBefore(mask.firstChild, mask);
        mask.remove();
        parent.normalize();
    });
};

/**
 * Hero entrance: h1 tách từ trượt lên có mask, các phần tử [data-hero-animate]
 * trượt lên stagger.
 */
export const useLandingEntrance = (scopeRef) => {
    useLayoutEffect(() => {
        if (!scopeRef.current) return undefined;
        const heading = scopeRef.current.querySelector("[data-hero-words]");

        if (prefersReducedMotion()) {
            return () => {
                if (heading) unwrapHeroWords(heading);
            };
        }

        const ctx = gsap.context(() => {
            if (heading) {
                const words = splitHeroWords(heading);
                if (words.length) {
                    gsap.set(words, { yPercent: 118, display: "inline-block" });
                    gsap.to(words, {
                        yPercent: 0,
                        duration: 0.85,
                        stagger: 0.055,
                        ease: "power4.out",
                        delay: 0.08,
                    });
                }
            }
            gsap.from("[data-hero-animate]", {
                y: 26,
                autoAlpha: 0,
                duration: 0.7,
                stagger: 0.09,
                ease: "power3.out",
                delay: heading ? 0.28 : 0.05,
            });
        }, scopeRef);
        return () => {
            ctx.revert();
            if (heading) unwrapHeroWords(heading);
        };
    }, [scopeRef]);
};

/**
 * Scroll storytelling (ScrollTrigger):
 *  - Hero parallax: copy nâng chậm hơn visual, cả cụm mờ dần khi ra khỏi hero.
 *  - Section head: eyebrow/h2/p vào theo thứ tự, h2 rise có "mask" clip-path.
 *  - Thẻ (feature/step): batch stagger rise kèm rotateX nhẹ — cảm giác " dealt".
 *  - Stat band: số chạy đếm lên khi vào viewport.
 *  - Navbar: đổ shadow khi cuộn qua hero.
 *  - Hub row: visual trôi lệch nhẹ theo chiều cuộn (parallax depth).
 */
export const useScrollStorytelling = (scopeRef) => {
    useLayoutEffect(() => {
        if (!scopeRef.current || prefersReducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            /* Hero parallax */
            const hero = ".landing-hero";
            const heroTrigger = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
            gsap.to(".hero-copy", { yPercent: -16, opacity: 0.5, ease: "none", scrollTrigger: heroTrigger });
            gsap.to(".landing-stat-band", { yPercent: -8, ease: "none", scrollTrigger: heroTrigger });
            gsap.to(".hero-circuit", { yPercent: -22, ease: "none", scrollTrigger: heroTrigger });

            /* Section head: stagger + headline clip-rise */
            gsap.utils.toArray(".section-head").forEach((head) => {
                const h2 = head.querySelector("h2");
                const rest = head.querySelectorAll(".landing-eyebrow, p");
                const tween = { ease: "power3.out", stagger: 0.12, duration: 0.8 };
                if (h2) {
                    gsap.set(h2, { clipPath: "inset(0% 0% 100% 0%)", y: 26, autoAlpha: 0 });
                    gsap.to(h2, {
                        clipPath: "inset(-12% 0% -12% 0%)",
                        y: 0,
                        autoAlpha: 1,
                        scrollTrigger: { trigger: head, start: "top 82%", once: true },
                        duration: 0.9,
                        ease: "power3.out",
                    });
                }
                gsap.set(rest, { y: 18, autoAlpha: 0 });
                gsap.to(rest, {
                    ...tween,
                    y: 0,
                    autoAlpha: 1,
                    scrollTrigger: { trigger: head, start: "top 82%", once: true },
                });
            });

            /* Thẻ vào theo batch (feature grid + steps) */
            const cards = gsap.utils.toArray("[data-batch-reveal]");
            if (cards.length) {
                gsap.set(cards, { y: 36, autoAlpha: 0, rotateX: 6, transformPerspective: 900 });
                ScrollTrigger.batch(cards, {
                    start: "top 88%",
                    once: true,
                    onEnter: (batch) =>
                        gsap.to(batch, {
                            y: 0,
                            autoAlpha: 1,
                            rotateX: 0,
                            duration: 0.75,
                            stagger: 0.08,
                            ease: "power3.out",
                            overwrite: true,
                        }),
                });
            }

            /* Hub row parallax — đẩy panel con (không đụng data-reveal trên
               .hub-row-visual để hai tween không giành thuộc tính y) */
            gsap.utils.toArray(".hub-row").forEach((row) => {
                const panels = row.querySelectorAll(".hub-row-visual > *");
                if (!panels.length) return;
                gsap.fromTo(
                    panels,
                    { y: row.classList.contains("reverse") ? 30 : -30 },
                    {
                        y: row.classList.contains("reverse") ? -30 : 30,
                        ease: "none",
                        scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true },
                    },
                );
            });

            /* Counter stat band */
            gsap.utils.toArray("[data-count]").forEach((el) => {
                const target = Number(el.dataset.count || 0);
                const suffix = el.dataset.suffix || "";
                const state = { v: 0 };
                ScrollTrigger.create({
                    trigger: el,
                    start: "top 88%",
                    once: true,
                    onEnter: () =>
                        gsap.to(state, {
                            v: target,
                            duration: 1.5,
                            ease: "power2.out",
                            onUpdate: () => {
                                el.textContent = `${Math.round(state.v)}${suffix}`;
                            },
                        }),
                });
            });

            /* Navbar shadow sau khi rời đỉnh */
            ScrollTrigger.create({
                start: 64,
                end: "max",
                toggleClass: { targets: ".landing-navbar", className: "is-scrolled" },
            });
        }, scopeRef);
        return () => ctx.revert();
    }, [scopeRef]);
};

/**
 * Pointer micro-interactions (chỉ desktop có hover):
 *  - [data-magnetic]: nút hút nhẹ về phía con trỏ, nhả ra bằng elastic.
 *  - [data-tilt]: mock panel nghiêng 3D theo con trỏ + lớp glare chạy theo.
 *  - .feature-card: spotlight gradient tại vị trí chuột (CSS var --mx/--my).
 */
export const usePointerMicroInteractions = (scopeRef) => {
    useEffect(() => {
        const root = scopeRef.current;
        if (!root || prefersReducedMotion() || !canHover()) return undefined;

        const cleanups = [];

        root.querySelectorAll("[data-magnetic]").forEach((el) => {
            const onMove = (event) => {
                const rect = el.getBoundingClientRect();
                const relX = event.clientX - (rect.left + rect.width / 2);
                const relY = event.clientY - (rect.top + rect.height / 2);
                gsap.to(el, { x: relX * 0.24, y: relY * 0.24, duration: 0.35, ease: "power2.out" });
            };
            const onLeave = () => {
                gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.42)" });
            };
            el.addEventListener("mousemove", onMove);
            el.addEventListener("mouseleave", onLeave);
            cleanups.push(() => {
                el.removeEventListener("mousemove", onMove);
                el.removeEventListener("mouseleave", onLeave);
                gsap.killTweensOf(el);
            });
        });

        root.querySelectorAll("[data-tilt]").forEach((el) => {
            const onMove = (event) => {
                const rect = el.getBoundingClientRect();
                const nx = (event.clientX - rect.left) / rect.width - 0.5;
                const ny = (event.clientY - rect.top) / rect.height - 0.5;
                gsap.to(el, {
                    rotateY: nx * 7,
                    rotateX: -ny * 5,
                    transformPerspective: 1100,
                    duration: 0.5,
                    ease: "power2.out",
                });
                el.style.setProperty("--glare-x", `${((nx + 0.5) * 100).toFixed(1)}%`);
                el.style.setProperty("--glare-y", `${((ny + 0.5) * 100).toFixed(1)}%`);
            };
            const onLeave = () => {
                gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" });
            };
            el.addEventListener("mousemove", onMove);
            el.addEventListener("mouseleave", onLeave);
            cleanups.push(() => {
                el.removeEventListener("mousemove", onMove);
                el.removeEventListener("mouseleave", onLeave);
                gsap.killTweensOf(el);
            });
        });

        root.querySelectorAll(".feature-card").forEach((el) => {
            const onMove = (event) => {
                const rect = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                el.style.setProperty("--my", `${event.clientY - rect.top}px`);
            };
            el.addEventListener("mousemove", onMove);
            cleanups.push(() => el.removeEventListener("mousemove", onMove));
        });

        return () => cleanups.forEach((fn) => fn());
    }, [scopeRef]);
};

/**
 * Reveal on scroll: phần tử [data-reveal] trượt lên mờ dần khi cuộn tới
 * (IntersectionObserver + gsap.to, mỗi phần tử chỉ chạy 1 lần).
 */
export const useRevealOnScroll = (scopeRef) => {
    useLayoutEffect(() => {
        if (!scopeRef.current || prefersReducedMotion()) return undefined;
        const root = scopeRef.current;
        const targets = root.querySelectorAll("[data-reveal]");
        if (!targets.length) return undefined;

        gsap.set(targets, { y: 26, autoAlpha: 0 });

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    gsap.to(entry.target, {
                        y: 0,
                        autoAlpha: 1,
                        duration: 0.65,
                        ease: "power3.out",
                        delay: Number(entry.target.dataset.revealDelay || 0),
                    });
                    io.unobserve(entry.target);
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
        );

        targets.forEach((t) => io.observe(t));
        return () => io.disconnect();
    }, [scopeRef]);
};
