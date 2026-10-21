import React, { useEffect, useState } from 'react';
import useReducedMotion from '../../hooks/useReducedMotion';

const AnimatedBackground = ({ variant = 'default', showGrid = true }) => {
  const prefersReducedMotion = useReducedMotion();
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const handleVisibility = () => {
      setTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const shouldAnimate = !prefersReducedMotion && tabVisible;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Background base subtle tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/40 via-slate-50 to-slate-50" />

      {/* 3 Large Blurred Gradient Orbs (Indigo, Teal, Violet) with opacity 0.2 - 0.3 */}
      <div
        className={`absolute -top-24 left-[15%] w-[520px] sm:w-[720px] h-[360px] sm:h-[480px] bg-indigo-600/26 rounded-full blur-[120px] will-change-transform ${
          shouldAnimate ? 'animate-orb-indigo' : ''
        }`}
      />
      <div
        className={`absolute top-[22%] -right-16 w-[460px] sm:w-[640px] h-[320px] sm:h-[440px] bg-teal-500/25 rounded-full blur-[110px] will-change-transform ${
          shouldAnimate ? 'animate-orb-teal' : ''
        }`}
      />
      <div
        className={`absolute -bottom-20 left-[10%] w-[500px] sm:w-[680px] h-[350px] sm:h-[460px] bg-violet-600/22 rounded-full blur-[115px] will-change-transform ${
          shouldAnimate ? 'animate-orb-violet' : ''
        }`}
      />

      {/* Faint Dot Grid with smooth radial fade mask */}
      {showGrid && (
        <div
          className="absolute inset-0 bg-dot-pattern opacity-70"
          style={{
            maskImage: 'radial-gradient(ellipse 75% 65% at 50% 35%, black 35%, transparent 95%)',
            WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 35%, black 35%, transparent 95%)'
          }}
        />
      )}
    </div>
  );
};

export default AnimatedBackground;
