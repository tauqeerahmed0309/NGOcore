import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import useReducedMotion from '../../hooks/useReducedMotion';

/**
 * Accordion
 * Silky-smooth CSS grid-template-rows animation (0fr -> 1fr)
 * Full accessibility, keyboard focus, and prefers-reduced-motion support
 */
const Accordion = ({ items }) => {
  const [openIndex, setOpenIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={item.question}
            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
              isOpen
                ? 'bg-white border-indigo-200/90 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-400/10'
                : 'bg-slate-50/70 border-slate-200/80 hover:border-indigo-200 hover:bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
              className="w-full px-5 py-4 sm:px-6 sm:py-4.5 text-left flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer select-none group"
            >
              <span
                className={`text-sm sm:text-base font-bold transition-colors ${
                  isOpen ? 'text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'
                }`}
              >
                {item.question}
              </span>
              <div
                className={`ml-4 flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isOpen
                    ? 'rotate-180 bg-indigo-50 text-indigo-600 shadow-xs'
                    : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50/60 group-hover:text-indigo-500'
                }`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>

            {/* Smooth expansion container (grid 0fr -> 1fr) */}
            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                opacity: isOpen ? 1 : 0,
                transitionDuration: prefersReducedMotion ? '0ms' : '300ms'
              }}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
