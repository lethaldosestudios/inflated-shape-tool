import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Flow } from 'flow-sdk';
import { 
  SectionLabel, 
  PillButton, 
  FieldDropdown, 
  RangeSlider,
  SegmentedToggle
} from './components/Controls';
import { ColorPicker } from './components/ColorPicker';
import { getNearestColorName } from './lib/colors';

type TransparencyType = 'Opaque' | 'Semi-translucent' | 'Fully clear';

// Helper function to map percentage to descriptive volume phrases
function getPuffinessPhrase(value: number): string {
  if (value <= 10) {
    return 'a nearly flat, thin, sticker-like profile with minimal 3D volume and only the slightest hint of soft rounding at the edges';
  } else if (value <= 35) {
    return 'a subtle, gentle puffiness with soft, low-profile rounding—still relatively flat but with a slight cushioned dimension';
  } else if (value <= 65) {
    return 'a moderate, plush puffiness with clearly rounded, cushioned volume rising off the surface, like a soft pillow';
  } else if (value <= 90) {
    return 'a strong, pronounced puffiness with dramatic rounded volume, taut surface tension, and thick cushioned edges';
  } else {
    return 'an extreme, maximally overinflated appearance—like a balloon stretched to its fullest, with very taut, tight, glossy surface tension and bulging, exaggerated rounded volume far beyond the original flat silhouette';
  }
}

// Helper function to map percentage to descriptive gloss/sheen phrases.
// A raw "70% gloss" is not something the model can act on — it needs to know
// *what kind* of shine: matte absorption, satin diffusion, or mirror-sharp
// specular highlights are visually distinct effects, not points on one dial.
function getGlossPhrase(value: number): string {
  if (value <= 10) {
    return 'a completely matte, soft-touch rubber finish with no shine or reflections, absorbing light evenly across the surface';
  } else if (value <= 35) {
    return 'a soft satin finish with subtle sheen, catching only the strongest highlights while remaining mostly diffuse';
  } else if (value <= 65) {
    return 'a semi-gloss plastic finish with visible soft highlights and moderate reflectivity, like satin-coated vinyl';
  } else if (value <= 90) {
    return 'a glossy, wet-look plastic finish with sharp bright highlights and a reflective coated surface, like polished vinyl or laminated plastic';
  } else {
    return 'an extreme high-gloss, mirror-like finish with a hard laminated clearcoat, crisp specular highlights, and strong environment reflections, like glass-coated chrome';
  }
}

// Helper function to map percentage to descriptive surface-fold phrases.
// Low end = taut, unbroken surface; high end = deep creasing, the kind of
// wrinkling you get when an inflated material is pushed past its comfortable
// volume. Raw "80% fold detail" doesn't tell the model whether that means
// a few soft creases or a heavily crumpled surface — this does.
function getFoldDensityPhrase(value: number): string {
  if (value <= 10) {
    return 'a perfectly smooth, taut surface with no visible folds, creases, or wrinkles anywhere';
  } else if (value <= 35) {
    return 'a mostly smooth surface with a few soft, shallow creases forming only at the tightest curves or seams';
  } else if (value <= 65) {
    return 'moderate surface folding, with soft rounded creases and gentle wrinkles distributed naturally across curved areas';
  } else if (value <= 90) {
    return 'dense, pronounced surface folding, with deep creases, pinches, and wrinkles covering most of the form, like tightly packed inflated fabric';
  } else {
    return 'extremely dense, heavily crumpled surface folding, with overlapping deep creases and pinched wrinkles across nearly the entire surface, like an overstuffed inflatable pushed past capacity';
  }
}

// Helper function to map percentage to descriptive asymmetry phrases.
// Low end = clean, mirrored, machine-uniform inflation; high end = organic,
// lopsided, hand-inflated irregularity. This is a shape-distribution cue,
// not a material cue, but it needs the same banding treatment — "40%
// asymmetry" is meaningless to the model without a description of what kind
// of irregularity that implies.
function getAsymmetryPhrase(value: number): string {
  if (value <= 10) {
    return 'a perfectly symmetric, evenly balanced inflation with uniform volume distributed identically on all sides';
  } else if (value <= 35) {
    return 'a mostly symmetric inflation with only slight, subtle unevenness in volume from one side to the other';
  } else if (value <= 65) {
    return 'a noticeably asymmetric inflation, with clearly uneven volume and organic, imperfect lopsidedness across the form';
  } else if (value <= 90) {
    return 'a strongly asymmetric, irregular inflation, with pronounced lopsided bulging concentrated unevenly across the shape';
  } else {
    return 'an extremely irregular, chaotic asymmetric inflation, with wildly uneven, lumpy, organic bulging that reads as hand-inflated rather than uniform';
  }
}

export default function App() {
  // State for all parameters
  const [shape, setShape] = useState('Abstract loop');
  const [material, setMaterial] = useState('gloss plastic');
  const [colorHex, setColorHex] = useState('#FF4500');
  const [colorOpacity, setColorOpacity] = useState(100);
  const [transparency, setTransparency] = useState<TransparencyType>('Opaque');
  const [puffiness, setPuffiness] = useState(80);
  const [foldDensity, setFoldDensity] = useState(30);
  const [asymmetry, setAsymmetry] = useState(15);
  const [glossLevel, setGlossLevel] = useState(70);
  const [chromaColor, setChromaColor] = useState('Pure Green #00FF00');
  const [sizeNotes, setSizeNotes] = useState('');
  const [hasInteriorCutout, setHasInteriorCutout] = useState(true);

  // Reference Image State
  const [referenceImage, setReferenceImage] = useState<{ mediaId: string; base64: string; mimeType: string } | null>(null);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [sampledColor, setSampledColor] = useState<string | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ base64: string; mimeType: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Mapping transparency levels to detailed material prompts
  const transparencyMapping: Record<TransparencyType, string> = {
    'Opaque': 'high-gloss flexible plastic, no transparency',
    'Semi-translucent': 'semi-translucent flexible plastic, softly diffusing light through the material',
    'Fully clear': 'clear, transparent, high-gloss flexible plastic film with realistic light refraction and reflection through the material'
  };

  // Dynamic prompt construction
  const backgroundText = useMemo(() => {
    const colorPart = chromaColor.split(' #')[0].toLowerCase();
    const hexPart = chromaColor.split(' #')[1] ? ` (#${chromaColor.split(' #')[1]})` : '';
    return `${colorPart}${hexPart}`;
  }, [chromaColor]);
  
  const promptTemplate = useMemo(() => {
    const transDesc = transparencyMapping[transparency];
    const isClear = transparency === 'Fully clear';

    const colorName = getNearestColorName(colorHex);
    const colorClause = isClear
      ? ''
      : `, vivid ${colorName} (${colorHex}), ${colorOpacity}% material opacity`;

    const shapeLockClause = referenceImage
      ? `Using the attached reference image as the exact shape, silhouette, proportions, and contours to preserve—do not alter its form, geometry, or aspect ratio in any way. `
      : '';

    const cutoutClause = hasInteriorCutout
      ? `Preserve any interior holes, negative space, or cutout regions exactly as shown in the reference image—these openings must remain fully open and hollow, not filled in or sealed over, even as the surrounding material inflates. `
      : '';

    const puffinessPhrase = getPuffinessPhrase(puffiness);
    const glossPhrase = getGlossPhrase(glossLevel);
    const foldPhrase = getFoldDensityPhrase(foldDensity);
    const asymmetryPhrase = getAsymmetryPhrase(asymmetry);
    
    const shapeNoun = referenceImage
      ? 'object matching the reference image'
      : shape;

    return `${shapeLockClause}${cutoutClause}Render this as a premium soft-inflated ${shapeNoun} made of ${transDesc} ${material}${colorClause}, with ${puffinessPhrase}, ${foldPhrase}, ${asymmetryPhrase}, and ${glossPhrase}, soft diffused studio lighting, on a solid flat ${backgroundText} background, no gradients, no shadows on the background, sharp clean edges.`;
  }, [shape, material, colorHex, colorOpacity, transparency, puffiness, foldDensity, asymmetry, glossLevel, backgroundText, transparencyMapping, referenceImage, hasInteriorCutout]);

  useEffect(() => {
    // Inject global styles for scrollbars and range inputs
    const styleId = 'flow-app-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; width: 100%; cursor: pointer; padding: 8px 0; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 3px; background: #595959; border-radius: 9999px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: white; box-shadow: 0px 1px 3px rgba(0,0,0,0.05); margin-top: -5.5px; cursor: grab; }
        input[type=range]::-webkit-slider-thumb:active { cursor: grabbing; }
        .dark-scrollbar::-webkit-scrollbar { width: 4px; }
        .dark-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .dark-scrollbar::-webkit-scrollbar-thumb { background: #595959; border-radius: 10px; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; background: #0e0e0e; color: white; overflow: hidden; font-family: 'Google Sans Text', sans-serif; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleSelectReference = async () => {
    try {
      const media = await Flow.media.select({ filter: 'image' });
      if (media) setReferenceImage(media);
    } catch (err) {
      console.error('Selection failed', err);
    }
  };

  const handleReferenceClick = (e: React.MouseEvent) => {
    if (!eyedropperActive || !referenceImage) return;
    
    const imgElement = e.currentTarget.querySelector('img');
    if (!imgElement) return;

    const rect = imgElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width);
    const y = ((e.clientY - rect.top) / rect.height);

    const tempCanvas = document.createElement('canvas');
    const tempImg = new Image();
    tempImg.onload = () => {
      tempCanvas.width = tempImg.width;
      tempCanvas.height = tempImg.height;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(tempImg, 0, 0);
        const pixel = ctx.getImageData(x * tempImg.width, y * tempImg.height, 1, 1).data;
        const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
        setSampledColor(hex);
        setTimeout(() => setSampledColor(null), 100);
      }
    };
    tempImg.src = `data:${referenceImage.mimeType};base64,${referenceImage.base64}`;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const img = await Flow.generate.image({
        prompt: promptTemplate,
        modelDisplayName: '🍌 Nano Banana Pro',
        aspectRatio: '1:1',
        referenceImageMediaIds: referenceImage ? [referenceImage.mediaId] : undefined,
      });
      setResult(img);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    setSaveState('saving');
    try {
      await Flow.download({
        base64: result.base64,
        mimeType: result.mimeType,
        filename: `inflated_${shape.replace(/\s+/g, '_').toLowerCase()}.png`
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSaveState('idle');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0e0e0e]">
      {/* Settings Side Panel */}
      <aside className="w-[300px] border-r border-white/15 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-y-auto p-[10px] py-[12px] flex flex-col gap-[24px] dark-scrollbar">
          
          {/* Reference Image Slot */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Reference Geometry</SectionLabel>
            <div 
              onClick={eyedropperActive ? handleReferenceClick : handleSelectReference}
              className={`relative group h-[120px] rounded-xl border border-dashed transition-all flex flex-col items-center justify-center overflow-hidden
                ${referenceImage ? 'border-white/20 bg-white/5' : 'border-white/15 hover:border-white/30 hover:bg-white/5'}
                ${eyedropperActive ? 'cursor-crosshair ring-2 ring-amber-500/50' : 'cursor-pointer'}
              `}
            >
              {referenceImage ? (
                <>
                  <img 
                    src={`data:${referenceImage.mimeType};base64,${referenceImage.base64}`} 
                    className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" 
                    alt="Ref"
                  />
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${eyedropperActive ? 'bg-black/20 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                    <span className="material-symbols-outlined text-white">
                      {eyedropperActive ? 'colorize' : 'edit'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-white/30">
                  <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                  <span className="text-[10px] font-medium tracking-wide">DROP OR SELECT SHAPE</span>
                </div>
              )}
            </div>
            {referenceImage && (
              <button 
                onClick={(e) => { e.stopPropagation(); setReferenceImage(null); }}
                className="text-[10px] text-white/40 hover:text-white/60 flex items-center gap-1 self-end transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
                Clear Reference
              </button>
            )}
          </div>

          {/* Object Section */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Object & Material</SectionLabel>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col gap-0.5 border border-[#595959] rounded-xl px-2.5 py-[5px]">
                <span className="text-[11px] font-medium text-white/35">Shape Description</span>
                <input 
                  className="bg-transparent text-[11px] font-medium text-white outline-none"
                  value={shape}
                  onChange={(e) => setShape(e.target.value)}
                  placeholder="e.g. Letter 'A'"
                />
              </div>
              <div className="flex flex-col gap-0.5 border border-[#595959] rounded-xl px-2.5 py-[5px]">
                <span className="text-[11px] font-medium text-white/35">Material Modifier</span>
                <input 
                  className="bg-transparent text-[11px] font-medium text-white outline-none"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. soft-touch vinyl"
                />
              </div>
              
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[11px] font-medium text-white/35 px-1">Material Color</span>
                <ColorPicker 
                  hex={colorHex}
                  opacity={colorOpacity}
                  onChange={(h, o) => { setColorHex(h); setColorOpacity(o); }}
                  onEyedropperActive={setEyedropperActive}
                  eyedropperColor={sampledColor}
                />
              </div>
            </div>
          </div>

          {/* Transparency Section */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Material Transparency</SectionLabel>
            <SegmentedToggle 
              value={transparency}
              onChange={(v) => setTransparency(v as TransparencyType)}
              items={[
                { value: 'Opaque', label: 'Opaque' },
                { value: 'Semi-translucent', label: 'Translucent' },
                { value: 'Fully clear', label: 'Clear' },
              ]}
            />
          </div>

          {/* Properties Section */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Inflation Parameters</SectionLabel>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Interior Cutouts</span>
                <button 
                  onClick={() => setHasInteriorCutout(!hasInteriorCutout)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${hasInteriorCutout ? 'bg-white' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${hasInteriorCutout ? 'right-0.5 bg-black' : 'left-0.5 bg-white/40'}`} />
                </button>
              </div>
              <RangeSlider 
                label="Puffiness" 
                value={puffiness} 
                min={0} max={100} 
                onChange={setPuffiness} 
                formatValue={(v) => `${v}%`}
              />
              <RangeSlider 
                label="Fold Density" 
                value={foldDensity} 
                min={0} max={100} 
                onChange={setFoldDensity} 
                formatValue={(v) => `${v}%`}
              />
              <RangeSlider 
                label="Asymmetry" 
                value={asymmetry} 
                min={0} max={100} 
                onChange={setAsymmetry} 
                formatValue={(v) => `${v}%`}
              />
              <RangeSlider 
                label="Gloss/Sheen" 
                value={glossLevel} 
                min={0} max={100} 
                onChange={setGlossLevel} 
                formatValue={(v) => `${v}%`}
              />
            </div>
          </div>

          {/* Scene Section */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Scene</SectionLabel>
            <div className="flex flex-col gap-1.5">
              <FieldDropdown 
                label="Background Color"
                value={chromaColor}
                options={[
                  'Pure Green #00FF00', 
                  'Pure Blue #0000FF', 
                  'Pure Black #000000', 
                  'Pure White #FFFFFF'
                ]}
                onChange={setChromaColor}
              />
              <div className="flex flex-col gap-0.5 border border-[#595959] rounded-xl px-2.5 py-[5px]">
                <span className="text-[11px] font-medium text-white/35">Size/Scale Notes</span>
                <input 
                  className="bg-transparent text-[11px] font-medium text-white outline-none"
                  value={sizeNotes}
                  onChange={(e) => setSizeNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </div>

          {/* Prompt Preview */}
          <div className="flex flex-col gap-2 mt-2">
            <SectionLabel>Locked Prompt Template</SectionLabel>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-[10px] text-white/60 leading-relaxed font-mono">
              {promptTemplate}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-[10px] pt-2 border-t border-white/15 bg-[#0e0e0e]">
          <PillButton 
            variant="solid" 
            onClick={handleGenerate} 
            disabled={isGenerating}
            icon={isGenerating ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-1" /> : <span className="material-symbols-outlined text-[18px]">auto_awesome</span>}
          >
            {isGenerating ? 'Generating...' : 'Generate Shape'}
          </PillButton>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {!result && !isGenerating && (
          <div className="flex flex-col items-center gap-4 text-white/30">
            <span className="material-symbols-outlined text-[64px]">bubble_chart</span>
            <p className="text-sm font-medium">Adjust settings and click generate to create your 3D inflated shape.</p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-64 h-64 bg-white/5 rounded-2xl overflow-hidden animate-pulse flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-1">Inflating {shape}...</h3>
              <p className="text-white/40 text-sm">Applying {transparency.toLowerCase()} material properties</p>
            </div>
          </div>
        )}

        {result && !isGenerating && (
          <div className="max-w-2xl w-full flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
            <div className="relative group aspect-square bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img 
                src={`data:${result.mimeType};base64,${result.base64}`} 
                alt="Generated Inflated Shape" 
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 right-4">
                 <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase border border-white/10">
                   Chroma Ready
                 </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-3">
              <PillButton 
                variant="outline" 
                onClick={handleDownload}
                disabled={saveState !== 'idle'}
                icon={<span className="material-symbols-outlined text-[18px]">{saveState === 'saved' ? 'check' : 'download'}</span>}
              >
                {saveState === 'idle' ? 'Download for Compositing' : saveState === 'saving' ? 'Saving...' : 'Downloaded'}
              </PillButton>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
