import React, { useRef, useState, useEffect } from 'react';
import useReducedMotion from '../../hooks/useReducedMotion';

const TiltCard = ({
  children,
  className = '',
  maxTilt = 6,
  glare = true,
  onClick,
  ...rest
}) => {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, active: false });
  const prefersReducedMotion = useReducedMotion();
  const [isFinePointer, setIsFinePointer] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsFinePointer(window.matchMedia('(pointer: fine)').matches);
    }
  }, []);

  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !isFinePointer || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTilt({ x: rotateX, y: rotateY });
    setSpotlight({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      active: true
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setSpotlight((prev) => ({ ...prev, active: false }));
  };

  const cardStyle = {
    transform:
      !prefersReducedMotion && isFinePointer
        ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
        : 'none',
    transition:
      tilt.x === 0 && tilt.y === 0
        ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
        : 'transform 0.1s ease-out'
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={cardStyle}
      className={`relative overflow-hidden ${className}`}
      {...rest}
    >
      {/* Dynamic specular light reflection sheen */}
      {glare && spotlight.active && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 320px at ${spotlight.x}% ${spotlight.y}%, rgba(255, 255, 255, 0.25), transparent 70%)`
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
};

export default TiltCard;
