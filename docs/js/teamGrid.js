import { $ } from './utils.js';
import { TEAM_ROLES } from './constants.js';

export function init() {
  const teamWrap = $('#teamGrid');
  if (!teamWrap) return;
  TEAM_ROLES.forEach(r => {
    const slug = r.replace(/\s+/g, '_');
    const box = document.createElement('div');
    box.innerHTML = `<label>${r}</label><input type="text" data-team="${r}" data-field="team_${slug}" placeholder="Vardas Pavardė">`;
    teamWrap.appendChild(box);
  });
}

