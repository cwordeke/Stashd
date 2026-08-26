"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

interface StashPosterTiltProps {
  children: ReactNode;
  className?: string;
  title?: string;
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  as?: "link" | "button";
  tiltEnabled?: boolean;
}

const RESET: CSSProperties = {
  transform:
    "perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0) scale(1)",
  boxShadow: "0 4px 14px -6px rgba(0, 0, 0, 0.55)",
};

export default function StashPosterTilt({
  children,
  className,
  title,
  href,
  onClick,
  as = "link",
  tiltEnabled = true,
}: StashPosterTiltProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<number | null>(null);
  const [style, setStyle] = useState<CSSProperties>(RESET);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (!tiltEnabled) setStyle(RESET);
  }, [tiltEnabled]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const handleMove = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (reduceMotion || !tiltEnabled) return;
      const el = as === "button" ? buttonRef.current : linkRef.current;
      if (!el) return;

      const { clientX, clientY } = event;
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);

      frameRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const px = (clientX - rect.left) / rect.width;
        const py = (clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 22;
        const rotateX = (0.5 - py) * 22;
        const lift = 10 + Math.abs(px - 0.5) * 6 + Math.abs(py - 0.5) * 6;

        setStyle({
          transform: `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0, ${(-lift * 0.35).toFixed(2)}px, ${lift.toFixed(2)}px) scale(1.05)`,
          boxShadow: `
            ${(-rotateY * 0.6).toFixed(1)}px ${(8 + lift).toFixed(1)}px ${24 + lift}px -10px rgba(0,0,0,0.65),
            0 10px 18px -8px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.06)
          `,
          zIndex: 3,
        });
      });
    },
    [as, reduceMotion, tiltEnabled]
  );

  const handleLeave = useCallback(() => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    setStyle(RESET);
  }, []);

  const classNames = cn(
    "stash-poster relative block aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 outline-none will-change-transform",
    className
  );

  if (as === "button") {
    return (
      <button
        type="button"
        ref={buttonRef}
        title={title}
        aria-label={title}
        onClick={onClick}
        onMouseMove={tiltEnabled ? handleMove : undefined}
        onMouseLeave={tiltEnabled ? handleLeave : undefined}
        onBlur={tiltEnabled ? handleLeave : undefined}
        style={tiltEnabled ? style : RESET}
        className={classNames}
      >
        {children}
      </button>
    );
  }

  return (
    <Link
      href={href ?? "#"}
      ref={linkRef}
      title={title}
      draggable={false}
      onClick={onClick}
      onMouseMove={tiltEnabled ? handleMove : undefined}
      onMouseLeave={tiltEnabled ? handleLeave : undefined}
      onBlur={tiltEnabled ? handleLeave : undefined}
      style={tiltEnabled ? style : RESET}
      className={classNames}
    >
      {children}
    </Link>
  );
}
