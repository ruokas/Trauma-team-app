import { $, nowHM, timeZoneOffset } from './utils.js';

const entries = [];

export function logEvent(type, label, value = '', time = nowHM()) {
  entries.push({ time, type, label, value });
  renderTimeline();
}

export function getEntries(filter = '') {
  return entries
    .filter(e => !filter || e.type === filter)
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function renderTimeline() {
  const list = $('#timelineList');
  if (!list) return;
  const filter = $('#timelineFilter')?.value || '';
  const tz = timeZoneOffset();
  list.innerHTML = '';
  getEntries(filter).forEach(e => {
    const div = document.createElement('div');
    div.className = 'timeline-entry';
    div.textContent = `${e.time} ${tz} – ${e.label}${e.value ? ': ' + e.value : ''}`;
    list.appendChild(div);
  });
}

export function initTimeline() {
  $('#timelineFilter')?.addEventListener('change', renderTimeline);
  $('#timelineExport')?.addEventListener('click', () => {
    const tz = timeZoneOffset();
    const csv = entries
      .map(e => `${e.time} ${tz},${e.type},${e.label},${e.value}`)
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
  renderTimeline();
}

export function clearTimeline() {
  entries.length = 0;
  renderTimeline();
}
