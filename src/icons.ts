// UI icon set. 24px grid, stroke-based; the stroke width is applied in CSS (non-scaling) so every size stays crisp.
const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M7 7l10 10M17 7 7 17"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6M14 11v6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.6A7.5 7.5 0 0 1 9.4 4.5a7.5 7.5 0 1 0 10.1 10.1Z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  offline: '<path d="M3 3l18 18M8.6 15.6a4.8 4.8 0 0 1 6.8 0M5.3 12.3a9.5 9.5 0 0 1 4-2.3M18.7 12.3a9.5 9.5 0 0 0-1.9-1.4M2 8.9a14 14 0 0 1 3.7-2.5M22 8.9a14 14 0 0 0-10.8-3.6"/><circle class="fill" cx="12" cy="19.2" r="1.1"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9.5 2.5V6M14.5 2.5V6M9.5 18v3.5M14.5 18v3.5M2.5 9.5H6M2.5 14.5H6M18 9.5h3.5M18 14.5h3.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',
  dotCircle: '<circle cx="12" cy="12" r="8.5"/><circle class="fill" cx="12" cy="12" r="2.6"/>',
  alert: '<path d="M10.3 4.2 2.9 17.4A2 2 0 0 0 4.6 20.4h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4"/><circle class="fill" cx="12" cy="16.8" r="1"/>',
  minusCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/>',
  spinner: '<circle class="track" cx="12" cy="12" r="8.5"/><path d="M20.5 12A8.5 8.5 0 0 0 12 3.5"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  archive: '<rect x="3.5" y="4" width="17" height="4.5" rx="1"/><path d="M5 8.5v10a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-10M10 12.5h4"/>',
  link: '<path d="M10 13.5a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1M14 10.5a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1"/>',
  unlink: '<path d="M16.5 13.2 19 10.6a4.2 4.2 0 0 0-6-6l-2.5 2.6M7.5 10.8 5 13.4a4.2 4.2 0 0 0 6 6l2.5-2.6M8 3v2.5M3 8h2.5M16 21v-2.5M21 16h-2.5"/>',
  convert: '<path d="M16 3.5 19.5 7 16 10.5M19.5 7h-13M8 13.5 4.5 17 8 20.5M4.5 17h13"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/>',
  chevronDown: '<path d="M7 10l5 5 5-5"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 15.5 15.5 11 6 19.5"/>',
} as const;

export type IconName = keyof typeof paths;

export function icon(name: IconName, size = 16, className = '') {
  return `<svg class="icon${className ? ` ${className}` : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
