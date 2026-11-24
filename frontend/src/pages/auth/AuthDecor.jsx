import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Bot } from "lucide-react";
import TriangleField from "../../components/common/canvas/TriangleField";
import { prefersReducedMotion } from "./motionPrefs";

/**
 * Lớp trang trí của banner trái (Login/Register):
 * - Tam giác động như trang Overview (TriangleField, token-driven)
 * - 2 vòng tròn orbit xoay ngược chiều nhau + vệt sáng quét qua lại
 * - Entrance stagger nằm ở hook useShowcaseEntrance (file riêng)
 */
const AuthDecor = () => {
    const rootRef = useRef(null);

    useEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const ctx = gsap.context(() => {
            // Vòng trong xoay xuôi rất chậm
            gsap.to(".orbit-ring.ring-1", {
                rotation: 360,
                duration: 48,
                repeat: -1,
                ease: "none",
                transformOrigin: "50% 50%",
            });
            // Vòng ngoài xoay ngược chậm hơn
            gsap.to(".orbit-ring.ring-2", {
                rotation: -360,
                duration: 68,
                repeat: -1,
                ease: "none",
                transformOrigin: "50% 50%",
            });
            // Vệt sáng trên vòng ngoài quét qua lại (yoyo)
            gsap.to(".ring-sweep", {
                rotation: 58,
                duration: 5.4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                transformOrigin: "50% 50%",
            });
            // Quầng sáng "thở"
            gsap.to(".orbit-glow", {
                scale: 1.07,
                opacity: 0.85,
                duration: 4.6,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                transformOrigin: "50% 50%",
            });
            // Chip trạng thái nhấp nhô
            gsap.to(".orbit-chip", {
                y: -9,
                duration: 3.6,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
            });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    return (
        <div className="auth-decor" ref={rootRef} aria-hidden="true">
            <TriangleField />
            <span className="orbit-glow" />
            <div className="orbit-ring ring-2">
                <span className="ring-sweep" />
                <i className="orbit-dot d2" />
            </div>
            <div className="orbit-ring ring-1">
                <i className="orbit-dot" />
            </div>
            <span className="orbit-chip">
                <Bot size={11} /> 12 documents indexed
            </span>
        </div>
    );
};

export default AuthDecor;
