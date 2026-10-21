import { useState, useEffect } from 'react';

/**
 * Throttled mouse position hook using requestAnimationFrame for smooth, lag-free coordinates
 */
export const useMousePosition = (targetRef = null) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 });

  useEffect(() => {
    let animationFrameId = null;

    const handleMouseMove = (e) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        if (targetRef && targetRef.current) {
          const rect = targetRef.current.getBoundingClientRect();
          setMousePosition({
            x: e.clientX,
            y: e.clientY,
            elementX: e.clientX - rect.left,
            elementY: e.clientY - rect.top
          });
        } else {
          setMousePosition({
            x: e.clientX,
            y: e.clientY,
            elementX: e.clientX,
            elementY: e.clientY
          });
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetRef]);

  return mousePosition;
};

export default useMousePosition;
