"use client";

import { useEffect } from "react";

export default function LandingMotion() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const boot = async () => {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;

      gsap.registerPlugin(ScrollTrigger);

      const hoverCleanups: Array<() => void> = [];
      const context = gsap.context(() => {
        gsap.set(
          [
            ".hero-kicker",
            ".hero-copy h1",
            ".hero-copy > p:not(.hero-kicker):not(.hero-note)",
            ".hero-actions",
            ".hero-note",
            ".hero-product",
          ],
          { autoAlpha: 0, y: 24 },
        );
        gsap.set(".clip-tile", { autoAlpha: 0, x: 20 });

        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .to(".hero-kicker", { autoAlpha: 1, y: 0, duration: 0.55 })
          .to(".hero-copy h1", { autoAlpha: 1, y: 0, duration: 0.75 }, "-=0.34")
          .to(".hero-copy > p:not(.hero-kicker):not(.hero-note)", { autoAlpha: 1, y: 0, duration: 0.65 }, "-=0.45")
          .to(".hero-actions", { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.38")
          .to(".hero-note", { autoAlpha: 1, y: 0, duration: 0.48 }, "-=0.25")
          .to(".hero-product", { autoAlpha: 1, y: 0, duration: 0.75 }, "-=0.62")
          .to(".clip-tile", { autoAlpha: 1, x: 0, duration: 0.42, stagger: 0.08 }, "-=0.36");

        gsap.utils
          .toArray<HTMLElement>(
            ".hero-preview-band, .proof-strip, .section-heading, .feature-card, .workflow-card, .console-band, .platform-row, .pricing-card, .conversion-section",
          )
          .forEach((element) => {
            gsap.from(element, {
              autoAlpha: 0,
              y: 34,
              duration: 0.75,
              ease: "power3.out",
              scrollTrigger: {
                trigger: element,
                start: "top 84%",
                once: true,
              },
            });
          });

        gsap.utils
          .toArray<HTMLElement>(".primary-button, .secondary-button, .nav-cta, .pricing-card a")
          .forEach((button) => {
            const enter = () => gsap.to(button, { y: -2, duration: 0.18, ease: "power2.out" });
            const leave = () => gsap.to(button, { y: 0, duration: 0.18, ease: "power2.out" });

            button.addEventListener("mouseenter", enter);
            button.addEventListener("mouseleave", leave);

            hoverCleanups.push(() => {
              button.removeEventListener("mouseenter", enter);
              button.removeEventListener("mouseleave", leave);
            });
          });
      });

      cleanup = () => {
        hoverCleanups.forEach((remove) => remove());
        context.revert();
      };
    };

    boot();

    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}
