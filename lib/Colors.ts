export const NAMED_COLORS = [
  { name: 'red', hex: '#FF0000' },
  { name: 'crimson', hex: '#DC143C' },
  { name: 'flame orange', hex: '#FF4500' },
  { name: 'burnt orange', hex: '#CC5500' },
  { name: 'amber', hex: '#FFBF00' },
  { name: 'yellow', hex: '#FFFF00' },
  { name: 'lime', hex: '#32CD32' },
  { name: 'emerald green', hex: '#50C878' },
  { name: 'forest green', hex: '#228B22' },
  { name: 'teal', hex: '#008080' },
  { name: 'cyan', hex: '#00FFFF' },
  { name: 'sky blue', hex: '#87CEEB' },
  { name: 'cobalt blue', hex: '#0047AB' },
  { name: 'electric blue', hex: '#7DF9FF' },
  { name: 'indigo', hex: '#4B0082' },
  { name: 'violet', hex: '#EE82EE' },
  { name: 'magenta', hex: '#FF00FF' },
  { name: 'hot pink', hex: '#FF69B4' },
  { name: 'rose gold', hex: '#B76E79' },
  { name: 'silver', hex: '#C0C0C0' },
  { name: 'slate', hex: '#708090' },
  { name: 'white', hex: '#FFFFFF' },
  { name: 'black', hex: '#000000' },
];

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function getNearestColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  let minDist = Infinity;
  let nearest = NAMED_COLORS[0].name;

  NAMED_COLORS.forEach(c => {
    const cRgb = hexToRgb(c.hex);
    const dist = Math.sqrt(
      Math.pow(rgb.r - cRgb.r, 2) +
      Math.pow(rgb.g - cRgb.g, 2) +
      Math.pow(rgb.b - cRgb.b, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = c.name;
    }
  });

  return nearest;
}
