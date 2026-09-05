import React, { useState, useRef, useEffect, useCallback } from 'react';
import { rgbToHex, hexToRgb, getNearestColorName, NAMED_COLORS } from '../lib/colors';

interface ColorPickerProps {
  hex: string;
  opacity: number;
  onChange: (hex: string, opacity: number) => void;
  onEyedropperActive: (active: boolean) => void;
  eyedropperColor?: string | null;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  hex, 
  opacity, 
  onChange, 
  onEyedropperActive,
  eyedropperColor 
}) => {
  const [mode, setMode] = useState<'grid' | 'spectrum' | 'sliders'>('spectrum');
  const [isEyedropperMode, setIsEyedropperMode] = useState(false);
  const [savedSwatches, setSavedSwatches] = useState<string[]>(['#FF4500', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00']);
  
  const spectrumRef = useRef<HTMLCanvasElement>(null);

  // Sync eyedropper color if it comes from parent
  useEffect(() => {
    if (eyedropperColor && isEyedropperMode) {
      onChange(eyedropperColor, opacity);
      setIsEyedropperMode(false);
      onEyedropperActive(false);
    }
  }, [eyedropperColor, isEyedropperMode, onChange, opacity, onEyedropperActive]);

  const drawSpectrum = useCallback(() => {
    const canvas = spectrumRef.current;
    if (!canvas || mode !== 'spectrum') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const gradientH = ctx.createLinearGradient(0, 0, width, 0);
    gradientH.addColorStop(0, 'rgb(255, 0, 0)');
    gradientH.addColorStop(0.17, 'rgb(255, 255, 0)');
    gradientH.addColorStop(0.34, 'rgb(0, 255, 0)');
    gradientH.addColorStop(0.51, 'rgb(0, 255, 255)');
    gradientH.addColorStop(0.68, 'rgb(0, 0, 255)');
    gradientH.addColorStop(0.85, 'rgb(255, 0, 255)');
    gradientH.addColorStop(1, 'rgb(255, 0, 0)');
    ctx.fillStyle = gradientH;
    ctx.fillRect(0, 0, width, height);

    const gradientV = ctx.createLinearGradient(0, 0, 0, height);
    gradientV.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradientV.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradientV.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    gradientV.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = gradientV;
    ctx.fillRect(0, 0, width, height);
  }, [mode]);

  useEffect(() => {
    drawSpectrum();
  }, [drawSpectrum]);

  const handleSpectrumClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = spectrumRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(x, y, 1, 1).data;
    onChange(rgbToHex(data[0], data[1], data[2]), opacity);
  };

  const handleAddSwatch = () => {
    if (!savedSwatches.includes(hex)) {
      setSavedSwatches([hex, ...savedSwatches.slice(0, 11)]);
    }
  };

  const toggleEyedropper = () => {
    const next = !isEyedropperMode;
    setIsEyedropperMode(next);
    onEyedropperActive(next);
  };

  const rgb = hexToRgb(hex);

  return (
    <div className="flex flex-col gap-3 w-full bg-white/5 p-3 rounded-xl border border-white/10">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-2">
        {(['grid', 'spectrum', 'sliders'] as const).map(t => (
          <button 
            key={t} 
            onClick={() => setMode(t)}
            className={`flex-1 text-[10px] uppercase font-bold tracking-wider py-1 rounded-md transition-colors ${mode === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Main Area */}
      <div className="h-[120px] w-full relative">
        {mode === 'grid' && (
          <div className="grid grid-cols-6 gap-1.5 h-full overflow-y-auto dark-scrollbar pr-1">
            {NAMED_COLORS.map(c => (
              <button 
                key={c.hex} 
                onClick={() => onChange(c.hex, opacity)}
                className="aspect-square rounded-md border border-white/10 hover:scale-105 transition-transform"
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        )}

        {mode === 'spectrum' && (
          <canvas 
            ref={spectrumRef}
            width={260}
            height={120}
            onClick={handleSpectrumClick}
            className="w-full h-full rounded-lg cursor-crosshair border border-white/10"
          />
        )}

        {mode === 'sliders' && (
          <div className="flex flex-col gap-2 h-full justify-center">
            {(['r', 'g', 'b'] as const).map(channel => (
              <div key={channel} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/40 w-4 uppercase">{channel}</span>
                <input 
                  type="range" min="0" max="255" 
                  value={rgb[channel]}
                  onChange={(e) => {
                    const next = { ...rgb, [channel]: parseInt(e.target.value) };
                    onChange(rgbToHex(next.r, next.g, next.b), opacity);
                  }}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                />
                <span className="text-[10px] text-white/60 w-6 text-right">{rgb[channel]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleEyedropper}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${isEyedropperMode ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'}`}
          >
            <span className="material-symbols-outlined text-[18px]">colorize</span>
          </button>
          <div className="flex-1 flex flex-col gap-1">
             <div className="flex justify-between items-center px-1">
               <span className="text-[9px] font-bold text-white/30 uppercase">Opacity</span>
               <span className="text-[10px] text-white/60">{opacity}%</span>
             </div>
             <input 
               type="range" min="0" max="100" value={opacity} 
               onChange={(e) => onChange(hex, parseInt(e.target.value))}
               className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
             />
          </div>
        </div>

        {/* Selected Info & Swatches */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg border border-white/20" style={{ backgroundColor: hex }} />
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-white uppercase tracking-tight">{getNearestColorName(hex)}</span>
               <span className="text-[9px] text-white/40 font-mono leading-none">{hex}</span>
             </div>
          </div>
          
          <div className="flex gap-1 flex-1 justify-end overflow-x-hidden">
            {savedSwatches.map((s, i) => (
              <button 
                key={`${s}-${i}`}
                onClick={() => onChange(s, opacity)}
                className="w-5 h-5 rounded-md border border-white/10 flex-shrink-0"
                style={{ backgroundColor: s }}
              />
            ))}
            <button 
              onClick={handleAddSwatch}
              className="w-5 h-5 rounded-md border border-white/20 bg-white/5 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
            </button>
          </div>
        </div>
      </div>
      
      {isEyedropperMode && (
        <div className="text-[9px] text-amber-400 font-bold text-center mt-1 animate-pulse">
          TAP REFERENCE IMAGE TO SAMPLE COLOR
        </div>
      )}
    </div>
  );
};
