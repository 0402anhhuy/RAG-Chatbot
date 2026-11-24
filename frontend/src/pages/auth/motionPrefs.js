import { useEffect } from "react";
import { gsap } from "gsap";

export const prefersReducedMotion = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Entrance stagger cho các phần tử [data-animate] trong banner auth. */
export const useShowcaseEntrance = (scopeRef) => {
    useEffect(() => {
        if (!scopeRef.current || prefersReducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            gsap.from("[data-animate]", {
                y: 18,
                autoAlpha: 0,
                duration: 0.55,
                stagger: 0.09,
                ease: "power2.out",
                delay: 0.05,
            });
        }, scopeRef);
        return () => ctx.revert();
    }, [scopeRef]);
};
