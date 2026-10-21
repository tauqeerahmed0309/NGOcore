import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useReducedMotion from '../../hooks/useReducedMotion';

const MagneticButton = ({
  children,
  to,
  onClick,
  className = '',
  maxOffset = 8,
  type = 'button',
  disabled = false,
  ...rest
}) => {
  const buttonRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();
  const [isFinePointer, setIsFinePointer] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsFinePointer(window.matchMedia('(pointer: fine)').matches);
    }
  }, []);

  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !isFinePointer || disabled) return;
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    setOffset({
      x: deltaX * maxOffset,
      y: deltaY * maxOffset
    });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const dynamicStyle = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    transition: offset.x === 0 && offset.y === 0 ? 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)' : 'transform 0.1s ease-out'
  };

  if (to) {
    return (
      <Link
        ref={buttonRef}
        to={to}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={dynamicStyle}
        className={`inline-block ${className}`}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={dynamicStyle}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
};

export default MagneticButton;
