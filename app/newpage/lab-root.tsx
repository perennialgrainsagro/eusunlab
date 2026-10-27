"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { startRoots } from "./roots.js";

// Hosts the root canvas animation, depth meter and crop/segmentation toggles from roots.js.
export function LabRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? startRoots(ref.current) : undefined), []);
  return <div className="lab" ref={ref}>{children}</div>;
}
