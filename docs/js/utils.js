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
