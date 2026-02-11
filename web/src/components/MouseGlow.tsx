"use client";

import { useEffect, useRef } from "react";

const LIGHT_COLORS = [
  "#F0DAB1", // sand
  "#E8E4DC", // border
  "#EBEBEA", // background-hover
  "#FAFAF8", // card-hover
  "#FAF8F5", // background-secondary
];

const DARK_COLORS = [
  "#4A4A4A", // border-hover
  "#333333", // background-hover
  "#737370", // foreground-muted
  "#3F3F3F", // mid grey
];

// Linear gradient config
const OFFSETS = [203, 52, 318, 127, 274, 11, 166, 89];
const RANGES = [110, 65, 140, 85, 95, 125, 70, 105];
const STOPS = [38, 52, 44, 58, 35, 48, 55, 42];
const MIXES: Array<(px: number, py: number) => number> = [
  (px) => px,
  (_, py) => py,
  (px, py) => px * 0.3 + py * 0.7,
  (px) => 1 - px,
  (px, py) => px * 0.8 + py * 0.2,
  (_, py) => 1 - py,
  (px, py) => px * 0.5 + py * 0.5,
  (px, py) => (px + py) * 0.5,
];

// Radial point config - anchor positions and how much they react to cursor
const POINTS = [
  { ax: 0.1, ay: 0.1, rx: 0.25, ry: 0.15, size: 50 },
  { ax: 0.75, ay: 0.08, rx: -0.2, ry: 0.25, size: 45 },
  { ax: 0.4, ay: 0.55, rx: 0.18, ry: -0.22, size: 55 },
  { ax: 0.9, ay: 0.5, rx: -0.3, ry: 0.12, size: 42 },
  { ax: 0.2, ay: 0.85, rx: 0.22, ry: -0.18, size: 48 },
  { ax: 0.6, ay: 0.3, rx: -0.15, ry: 0.28, size: 52 },
  { ax: 0.05, ay: 0.45, rx: 0.28, ry: 0.2, size: 38 },
  { ax: 0.5, ay: 0.92, rx: -0.18, ry: -0.22, size: 46 },
  { ax: 0.95, ay: 0.25, rx: 0.15, ry: 0.25, size: 50 },
  { ax: 0.3, ay: 0.05, rx: -0.25, ry: 0.15, size: 40 },
  { ax: 0.55, ay: 0.7, rx: 0.2, ry: -0.28, size: 55 },
  { ax: 0.8, ay: 0.75, rx: -0.22, ry: 0.18, size: 44 },
  { ax: 0.15, ay: 0.65, rx: 0.3, ry: -0.12, size: 48 },
  { ax: 0.65, ay: 0.12, rx: -0.12, ry: 0.3, size: 42 },
  { ax: 0.45, ay: 0.4, rx: 0.22, ry: 0.22, size: 58 },
  { ax: 0.85, ay: 0.9, rx: -0.28, ry: -0.15, size: 40 },
];

function buildGradient(px: number, py: number, colors: string[]) {
  const linears = colors.map((color, i) => {
    const angle = Math.round(OFFSETS[i] + MIXES[i](px, py) * RANGES[i]);
    return `linear-gradient(${angle}deg, ${color} 0%, transparent ${STOPS[i]}%)`;
  });

  const radials = POINTS.map((pt, i) => {
    const color = colors[i % colors.length];
    const x = ((pt.ax + pt.rx * (px - 0.5) * 2) * 100).toFixed(1);
    const y = ((pt.ay + pt.ry * (py - 0.5) * 2) * 100).toFixed(1);
    return `radial-gradient(${pt.size}% ${pt.size}% at ${x}% ${y}%, ${color} 0%, transparent 100%)`;
  });

  return [...radials, ...linears].join(", ");
}

export function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const getColors = () =>
      document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? DARK_COLORS
        : LIGHT_COLORS;

    el.style.background = buildGradient(0.5, 0.5, getColors());

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      el.style.background = buildGradient(px, py, getColors());
    };

    const observer = new MutationObserver(() => {
      el.style.background = buildGradient(0.5, 0.5, getColors());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    parent.addEventListener("mousemove", handleMouseMove);

    return () => {
      parent.removeEventListener("mousemove", handleMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-20"
    />
  );
}
