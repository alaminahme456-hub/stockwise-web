import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  autoFocusOnExpand?: boolean;
}

export const ExpandableSearch: React.FC<ExpandableSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  ariaLabel = 'Search',
  autoFocusOnExpand = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && autoFocusOnExpand) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, autoFocusOnExpand]);

  // Collapse if clicked outside and query is empty
  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!value.trim()) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [value]);

  const handleOpen = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (value) {
        onChange('');
      } else {
        handleClose();
      }
    }
  };

  const hasQuery = Boolean(value.trim());

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-end ${className}`}
      data-testid="expandable-search"
    >
      <div
        className={`relative flex items-center rounded-xl bg-white border transition-all duration-300 ease-out ${
          isExpanded
            ? 'w-60 sm:w-72 md:w-80 border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
            : 'w-10 h-10 border-slate-200 hover:border-slate-300 shadow-xs hover:bg-slate-50'
        }`}
      >
        {/* Search Icon / Toggle Button */}
        <button
          type="button"
          onClick={() => {
            if (!isExpanded) {
              handleOpen();
            } else {
              inputRef.current?.focus();
            }
          }}
          className={`h-10 flex items-center justify-center shrink-0 transition-colors cursor-pointer select-none ${
            isExpanded ? 'w-9 pl-3 text-blue-600' : 'w-full text-slate-600 hover:text-blue-600'
          }`}
          title={isExpanded ? 'Search query active' : placeholder}
          aria-label={ariaLabel}
          aria-expanded={isExpanded}
        >
          <Search className="w-4 h-4 shrink-0 transition-transform duration-200" />
          
          {/* Active indicator badge when collapsed with text */}
          {!isExpanded && hasQuery && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* Search Input Field - smoothly expands */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all duration-300 ease-out ${
            isExpanded
              ? 'w-full pr-16 py-2 opacity-100 pointer-events-auto'
              : 'w-0 p-0 opacity-0 pointer-events-none'
          }`}
          tabIndex={isExpanded ? 0 : -1}
        />

        {/* Clear & Close Action Buttons when expanded */}
        <div
          className={`absolute right-1.5 flex items-center gap-0.5 transition-opacity duration-200 ${
            isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {hasQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Collapse search"
            aria-label="Collapse search bar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
