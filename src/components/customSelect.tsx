// components/ui/CustomSelect.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Lock } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select option" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(opt => opt.value === value)?.label;

  return (
    <div className="relative w-full font-mono" ref={ref}>
      {/* The Trigger Button */}
      <button
        type="button" // Prevent form submission
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[#061418] border rounded p-3 text-left transition-all text-sm
          ${isOpen 
            ? 'border-[#C9A66B] ring-1 ring-[#C9A66B]/20 text-[#E8E4D9]' 
            : 'border-[#E8E4D9]/20 hover:border-[#E8E4D9]/40 text-[#E8E4D9]/70'}
        `}
      >
        <span className="truncate">
          {selectedLabel || <span className="text-[#E8E4D9]/30">{placeholder}</span>}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-[#E8E4D9]/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* The Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#061418] border border-[#E8E4D9]/10 rounded-md shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1 space-y-0.5">
            {options.map((option) => {
              const isSelected = value === option.value;
              const isDisabled = option.disabled;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded text-left transition-colors
                    ${isSelected 
                      ? 'bg-[#C9A66B]/10 text-[#C9A66B]' 
                      : isDisabled 
                        ? 'text-[#E8E4D9]/20 cursor-not-allowed bg-white/[0.02]' 
                        : 'text-[#E8E4D9]/70 hover:bg-[#E8E4D9]/5 hover:text-[#E8E4D9]'}
                  `}
                >
                  <span className="flex items-center gap-2">
                    {option.label}
                    {isDisabled && <Lock className="w-3 h-3 opacity-50" />}
                  </span>
                  
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;