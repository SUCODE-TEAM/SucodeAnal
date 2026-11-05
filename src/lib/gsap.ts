"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(useGSAP, SplitText, Flip, DrawSVGPlugin, ScrollToPlugin);
gsap.defaults({ ease: "expo.out", duration: 0.7 });

// Every animation in the app goes through this query so users who prefer
// reduced motion get the final state instantly.
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, useGSAP, SplitText, Flip };

