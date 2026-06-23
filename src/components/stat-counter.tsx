"use client";

import { useEffect, useState } from "react";

export function StatCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    let raf = 0;
    const total = 42;
    const tick = () => {
      frame += 1;
      const progress = Math.min(frame / total, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className="font-mono text-3xl font-medium text-text-primary">
      {display}
      {suffix}
    </span>
  );
}
