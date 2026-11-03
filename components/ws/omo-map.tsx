'use client';
// Illustrative (not to scale) map of South Omo Zone woredas with office markers.
export const OFFICE_POS: Record<string, [number, number]> = {
  'Zone office (Jinka)': [244, 140], 'Jinka Town': [210, 168], 'North Ari': [246, 92], 'South Ari': [206, 206], Male: [306, 168],
  'Bena-Tsemay': [292, 252], Hamer: [230, 318], Dasenech: [142, 404], Nyangatom: [96, 300], Selamago: [150, 120],
};
export type MapMarker = { office: string; label?: string; value?: number; tone?: 'blue' | 'red' | 'gold' | 'teal' | 'grey'; size?: number };

export function OmoMap({ markers, selected, onSelect, legend }: { markers: MapMarker[]; selected?: string; onSelect?: (office: string) => void; legend?: React.ReactNode }) {
  return <figure className="omo-map">
    <svg viewBox="0 0 400 460" role="img" aria-label="Illustrative map of South Omo Zone with office locations">
      <path className="omo-land" d="M150 18 L260 12 L330 60 L360 140 L345 230 L330 300 L280 360 L240 420 L190 440 L120 440 L70 400 L40 320 L50 230 L80 160 L110 80 Z" />
      <path className="omo-river" d="M170 20 C150 70 175 110 150 150 S120 230 140 270 S110 350 125 420 L130 440" />
      <ellipse className="omo-lake" cx="128" cy="452" rx="40" ry="14" />
      <text x="62" y="160" className="omo-label">Omo River</text><text x="98" y="448" className="omo-label">L. Turkana</text>
      {markers.map(m => { const p = OFFICE_POS[m.office]; if (!p) return null; const r = m.size ?? 9;
        return <g key={m.office} className={'omo-pin tone-' + (m.tone || 'blue') + (selected === m.office ? ' sel' : '')} transform={`translate(${p[0]} ${p[1]})`} onClick={() => onSelect?.(m.office)} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} onKeyDown={e => { if (e.key === 'Enter') onSelect?.(m.office); }}>
          <circle r={r + 6} className="omo-hit" /><circle r={r} />{m.value !== undefined && <text className="omo-val" dy="4">{m.value}</text>}
          <text className="omo-name" y={-r - 6}>{m.label || m.office.replace('Zone office (Jinka)', 'Zone office')}</text>
        </g>; })}
    </svg>
    <figcaption>{legend}<span>Illustrative map – not to scale.</span></figcaption>
  </figure>;
}
