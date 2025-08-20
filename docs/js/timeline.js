import { $, timeZoneOffset } from './utils.js';

const entries = [];

function parseTime(value) {
  if (typeof value === 'number') return value;
  const [h, m] = String(value).split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return Date.now();
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function formatTime(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function logEvent(type, label, value = '', time = Date.now()) {
  const timestamp = parseTime(time);
  entries.push({ time: timestamp, type, label, value });
  renderTimeline();
}

export function getEntries(filter = '') {
  return entries
    .filter(e => !filter || e.type === filter)
    .sort((a, b) => a.time - b.time);
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
    const t = formatTime(e.time);
    div.textContent = `${t} ${tz} – ${e.label}${e.value ? ': ' + e.value : ''}`;
    list.appendChild(div);
  });
}

export function initTimeline() {
  $('#timelineFilter')?.addEventListener('change', renderTimeline);
  $('#timelineExport')?.addEventListener('click', () => {
    const tz = timeZoneOffset();
    const csv = entries
      .map(e => `${formatTime(e.time)} ${tz},${e.type},${e.label},${e.value}`)
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
  $('#timelineClear')?.addEventListener('click', () => {
    if (confirm('Ar tikrai ištrinti visus įrašus?')) clearTimeline();
  });
  renderTimeline();
}

export function clearTimeline() {
  entries.length = 0;
  renderTimeline();
}
