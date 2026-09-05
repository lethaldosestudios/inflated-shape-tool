import React, { useState, useRef, useEffect } from 'react';

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center px-2">
    <span className="text-[11px] font-medium text-[rgba(218,220,224,0.9)] tracking-[0.1px] normal-case">
      {children}
    </span>
  </div>
);

export const PillButton: React.FC<{
  icon?: React.ReactNode; 
  children: React.ReactNode;
  variant?: 'filled' | 'outline' | 'solid'; 
  onClick?: () => void;
  disabled?: boolean;
}> = ({ icon, children, variant = 'filled', onClick, disabled }) => {
  const base = 'flex items-center gap-[6px] justify-center w-full h-[34px] rounded-xl font-medium tracking-[0.1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    filled: 'bg-[#969696] hover:bg-[#a6a6a6] active:bg-[#868686] text-black text-[11px] px-4 py-1 select-none',
    outline: 'border border-[#595959] hover:bg-white/5 active:bg-white/10 backdrop-blur-[40px] text-[12px] px-4 py-2 text-white select-none',
    solid: 'bg-white hover:bg-gray-200 active:bg-gray-300 text-black text-[12px] px-4 py-2 select-none',
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {icon}
      <span>{children}</span>
    </button>
  );
};

export const SegmentedToggle: React.FC<{
  value: string;
  items: { value: string; label: string; icon?: React.ReactNode }[];
  onChange: (val: string) => void;
}> = ({ value, items, onChange }) => (
  <div className="flex w-full items-center border border-[#595959] rounded-xl overflow-hidden bg-transparent">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className={`flex-1 flex items-center justify-center gap-1 h-[34px] px-2 py-2 text-[10px] font-medium tracking-[0.1px] transition-all cursor-pointer ${
          value === item.value ? 'bg-[#969696] text-black' : 'text-[rgba(218,220,224,0.75)] hover:text-white hover:bg-white/5'
        }`}
      >
        {item.icon}<span>{item.label}</span>
      </button>
    ))}
  </div>
);

export const FieldDropdown: React.FC<{
  label: string; value: string; options: string[];
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left border border-[#595959] hover:border-[#7a7a7a] transition-colors rounded-xl flex flex-col gap-0.5 justify-center pb-2 pl-2.5 pr-1 pt-[5px] select-none focus:outline-none">
        <p className="text-[11px] font-medium text-[rgba(255,255,255,0.35)] tracking-[0.1px]">{label}</p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-white tracking-[0.1px]">{value}</span>
          <span className={`material-symbols-outlined text-[16px] text-[rgba(218,220,224,0.5)] mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
        </div>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-full bg-[#0e0e0e] border border-[#595959] rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-40 overflow-y-auto">
            {options.map((opt) => (
              <button key={opt} type="button"
                className={`w-full text-left px-2.5 py-2 text-[11px] font-medium tracking-[0.1px] hover:bg-white/10 transition-colors ${value === opt ? 'bg-white/10 text-white' : 'text-[rgba(218,220,224,0.9)]'}`}
                onClick={() => { onChange(opt); setIsOpen(false); }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const RangeSlider: React.FC<{
  label: string; value: number; min: number; max: number;
  formatValue?: (val: number) => string;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, formatValue = (v) => String(v), onChange }) => (
  <div className="flex flex-col gap-1 pt-1 pb-[5px] w-full">
    <div className="flex items-center justify-between px-2 select-none">
      <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] font-medium text-white tracking-[0.1px]">{formatValue(value)}</span>
    </div>
    <div className="px-2 w-full flex items-center h-2">
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  </div>
);
