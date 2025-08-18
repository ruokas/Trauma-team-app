export const $ = (
  selector,
  scope = typeof document !== 'undefined' ? document : null,
) => (scope ? scope.querySelector(selector) : null);
export const $$ = (
  selector,
  scope = typeof document !== 'undefined' ? document : null,
) => (scope ? Array.from(scope.querySelectorAll(selector)) : []);
export const nowHM = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const timeZoneOffset = () => {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const minutes = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
};
