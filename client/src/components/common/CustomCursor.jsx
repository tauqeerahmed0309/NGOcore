import React, { useEffect, useRef, useState } from 'react';
import useReducedMotion from '../../hooks/useReducedMotion';

/**
 * SaaS Custom Cursor (Desktop Only)
 * Features:
 * - Center precise dot (6px) + larger trailing ring (38px) with smooth lerp
 * - Strictly pointer-events: none
 * - Desktop only (>= 1024px with fine pointer)
 * - Automatically shrinks/fades over text and logo to ensure 100% readability
 * - Hides completely over text inputs (respects native text-select caret)
 * - Full prefers-reduced-motion support
 */
const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkEnabled = () => {
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      const isDesktop = window.innerWidth >= 1024;
      return hasFinePointer && isDesktop && !prefersReducedMotion;
    };

    const isCurrentlyEnabled = checkEnabled();
    setEnabled(isCurrentlyEnabled);

    if (!isCurrentlyEnabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let isVisible = false;
    let isClicking = false;
    let isHovering = false;
    let isTextOrLogo = false;
    let isInputMode = false;
    let animId = null;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const render = () => {
      // Lerp ring towards mouse position (smooth lag)
      ringX = lerp(ringX, mouseX, 0.18);
      ringY = lerp(ringY, mouseY, 0.18);

      if (dot) {
        // Dot follows pointer directly
        const dotScale = isInputMode ? 0 : isTextOrLogo ? 0.4 : isClicking ? 0.6 : 1;
        dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${dotScale})`;
        dot.style.opacity = isVisible && !isInputMode ? (isTextOrLogo ? '0.3' : '1') : '0';
      }

      if (ring) {
        // Ring smoothly scales on hover and shrinks/fades over text and logo
        const ringScale = isInputMode
          ? 0
          : isTextOrLogo
          ? 0.5
          : isClicking
          ? 0.75
          : isHovering
          ? 1.35
          : 1;

        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${ringScale})`;
        ring.style.opacity = isVisible && !isInputMode
          ? isTextOrLogo
            ? '0.12'
            : isHovering
            ? '0.65'
            : '0.38'
          : '0';

        ring.style.borderColor = isHovering ? 'rgba(79, 70, 229, 0.85)' : 'rgba(99, 102, 241, 0.45)';
        ring.style.backgroundColor = isHovering ? 'rgba(79, 70, 229, 0.08)' : 'transparent';
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        ringX = mouseX;
        ringY = mouseY;
      }

      const target = e.target;
      if (target) {
        // 1. Text input / form fields -> hide custom cursor to allow native caret
        const isInput = target.closest('input, textarea, select, [contenteditable="true"]');
        isInputMode = Boolean(isInput);

        // 2. Headings, paragraphs, spans, and logo -> shrink/fade cursor so text is never obscured
        const isReadableTextOrLogo = target.closest(
          'h1, h2, h3, h4, h5, h6, p, blockquote, [data-brand="true"], .brand-logo, [data-text-safe="true"]'
        );
        isTextOrLogo = Boolean(isReadableTextOrLogo);

        // 3. Interactive clickables -> expand trailing ring for magnetic tactile feedback
        const isClickable = target.closest(
          'a, button, [role="button"], [data-interactive="true"], .clickable, [tabindex="0"]'
        );
        isHovering = Boolean(isClickable);
      }
    };

    const onMouseDown = () => {
      isClicking = true;
    };

    const onMouseUp = () => {
      isClicking = false;
    };

    const onMouseLeave = () => {
      isVisible = false;
    };

    const onResize = () => {
      const stillEnabled = checkEnabled();
      setEnabled(stillEnabled);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mouseleave', onMouseLeave);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [prefersReducedMotion]);

  if (!enabled) return null;

  return (
    <>
      {/* Center precise dot (6px) */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-indigo-600 pointer-events-none z-30 transition-opacity duration-150 will-change-transform shadow-xs"
        style={{ opacity: 0 }}
      />
      {/* Trailing soft ring (38px) */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-9 h-9 rounded-full border border-indigo-500/40 pointer-events-none z-30 transition-opacity duration-200 will-change-transform"
        style={{ opacity: 0 }}
      />
    </>
  );
};

export default CustomCursor;
