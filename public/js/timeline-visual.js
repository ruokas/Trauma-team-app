/* global vis */
let timeline;

export function initTimelineGraph () {
  const container = document.getElementById('timelineGraph');
  if (!container || typeof vis === 'undefined') return;
  timeline = new vis.Timeline(container, []);
}

export function renderTimelineGraph (entries) {
  if (!timeline) return;
  const items = entries.map((e, i) => ({
    id: i,
    content: e.label + (e.value ? ': ' + e.value : ''),
    start: new Date(e.time)
  }));
  timeline.setItems(items);
}
