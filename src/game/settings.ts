export interface GraphicsSettings {
  density: number; wind: number; turbulence: number; scattering: number;
  height: number; detail: number; quality: number;
}
export const presets: Record<string, GraphicsSettings> = {
  'Light Mist': { density: .45, wind: .7, turbulence: .7, scattering: 1, height: 2.8, detail: 2, quality: 1 },
  'Dense Fog': { density: 1.45, wind: .6, turbulence: 1.1, scattering: 1.1, height: 4.8, detail: 3, quality: 1 },
  'Cinematic': { density: .9, wind: .65, turbulence: .9, scattering: 1.35, height: 3.8, detail: 3, quality: 2 },
  'Maximum Fog': { density: 2.2, wind: 1, turbulence: 1.3, scattering: 1.6, height: 6, detail: 4, quality: 2 },
};
export const qualityLevels = [
  { label: 'Performance', scale: .35, steps: 32 },
  { label: 'Balanced', scale: .5, steps: 48 },
  { label: 'High', scale: .65, steps: 64 },
  { label: 'Ultra', scale: .85, steps: 88 },
];
export function loadSettings(): GraphicsSettings {
  try {
    const saved = JSON.parse(localStorage.getItem('fogarena-settings') || 'null');
    if (saved && Object.keys(presets.Cinematic).every(k => Number.isFinite(saved[k]))) {
      const s = { ...saved } as GraphicsSettings;
      s.density = Math.min(2.5, Math.max(.1, s.density));
      s.wind = Math.min(2, Math.max(0, s.wind)); s.turbulence = Math.min(2, Math.max(0, s.turbulence));
      s.scattering = Math.min(2, Math.max(0, s.scattering)); s.height = Math.min(8, Math.max(1, s.height));
      s.detail = Math.round(Math.min(4, Math.max(1, s.detail))); s.quality = Math.round(Math.min(3, Math.max(0, s.quality)));
      return s;
    }
  } catch { /* Private browsing can disable storage. */ }
  return { ...presets.Cinematic };
}
export function saveSettings(s: GraphicsSettings) { try { localStorage.setItem('fogarena-settings', JSON.stringify(s)); } catch { /* Optional persistence. */ } }
