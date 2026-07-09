import type { ComposerDestination } from '@/types/composer';

export const COMPOSER_DESTINATIONS: ComposerDestination[] = [
  { id: 'thailandia', label: 'Thailandia', emoji: '🇹🇭', region: 'Asia', vibe: 'Spiagge + street food' },
  { id: 'bali', label: 'Bali', emoji: '🇮🇩', region: 'Asia', vibe: 'Risaie e templi' },
  { id: 'giappone', label: 'Giappone', emoji: '🇯🇵', region: 'Asia', vibe: 'Cultura e sushi' },
  { id: 'grecia', label: 'Grecia', emoji: '🇬🇷', region: 'Europa', vibe: 'Isole e tramonti' },
  { id: 'spagna', label: 'Spagna', emoji: '🇪🇸', region: 'Europa', vibe: 'Tapas e movida' },
  { id: 'portogallo', label: 'Portogallo', emoji: '🇵🇹', region: 'Europa', vibe: 'Lisbona e surf' },
  { id: 'croazia', label: 'Croazia', emoji: '🇭🇷', region: 'Europa', vibe: 'Costa adriatica' },
  { id: 'islanda', label: 'Islanda', emoji: '🇮🇸', region: 'Europa', vibe: 'Aurora e natura' },
  { id: 'marocco', label: 'Marocco', emoji: '🇲🇦', region: 'Africa', vibe: 'Medina e deserto' },
  { id: 'dubai', label: 'Dubai', emoji: '🇦🇪', region: 'Medio Oriente', vibe: 'Skyline e lusso' },
  { id: 'new york', label: 'New York', emoji: '🇺🇸', region: 'Americhe', vibe: 'City che non dorme' },
  { id: 'messico', label: 'Messico', emoji: '🇲🇽', region: 'Americhe', vibe: 'Cenote e tacos' },
  { id: 'maldive', label: 'Maldive', emoji: '🇲🇻', region: 'Asia', vibe: 'Paradiso tropicale' },
  { id: 'sicilia', label: 'Sicilia', emoji: '🇮🇹', region: 'Italia', vibe: 'Mare e granita' },
  { id: 'sardegna', label: 'Sardegna', emoji: '🇮🇹', region: 'Italia', vibe: 'Calette segrete' },
  { id: 'canarie', label: 'Canarie', emoji: '🇪🇸', region: 'Europa', vibe: 'Sole tutto l\'anno' },
  { id: 'vietnam', label: 'Vietnam', emoji: '🇻🇳', region: 'Asia', vibe: 'Baia e pho' },
  { id: 'australia', label: 'Australia', emoji: '🇦🇺', region: 'Oceania', vibe: 'Surf e koala' },
];

export function filterDestinations(query: string): ComposerDestination[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMPOSER_DESTINATIONS;
  return COMPOSER_DESTINATIONS.filter(
    (d) =>
      d.label.toLowerCase().includes(q) ||
      d.region.toLowerCase().includes(q) ||
      d.vibe.toLowerCase().includes(q)
  );
}

export function findDestination(idOrLabel: string): ComposerDestination | undefined {
  const key = idOrLabel.trim().toLowerCase();
  return COMPOSER_DESTINATIONS.find(
    (d) => d.id === key || d.label.toLowerCase() === key
  );
}