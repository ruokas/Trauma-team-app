import { $$ } from './utils.js';

export function initCollapsibles(){
  $$('.view').forEach(view => {
    $$('fieldset.collapsible', view).forEach((fs, i) => {
      const legend = fs.querySelector('legend');
      if(!legend) return;
      const content = document.createElement('div');
      content.className = 'fieldset-content';
      while(legend.nextSibling){
        content.appendChild(legend.nextSibling);
      }
      fs.appendChild(content);
      legend.style.cursor = 'pointer';
      legend.setAttribute('role','button');
      legend.setAttribute('tabindex','0');
      const collapsed = view.id !== 'view-aktivacija' && i > 0;
      if(collapsed){
        fs.classList.add('collapsed');
        content.style.display = 'none';
        legend.setAttribute('aria-expanded','false');
      } else {
        legend.setAttribute('aria-expanded','true');
      }
      const toggle = () => {
        fs.classList.toggle('collapsed');
        const isCollapsed = fs.classList.contains('collapsed');
        content.style.display = isCollapsed ? 'none' : '';
        legend.setAttribute('aria-expanded', (!isCollapsed).toString());
      };
      legend.addEventListener('click', toggle);
      legend.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          toggle();
        }
      });
    });
  });
}
