import { getAuthToken, getSocket } from './sessionManager.js';

export function initCapacityDashboard(){
  const container = document.getElementById('capacityDashboard');
  if(!container) return;

  let resources = { beds: 0, ventilators: 0, staff: 0 };

  const render = () => {
    container.innerHTML = `
      <h2>Capacity Dashboard</h2>
      <div class="resource" data-type="beds">
        <span>Beds</span>
        <button type="button" class="btn dec" data-type="beds">-</button>
        <span class="count" id="bedsCount">${resources.beds}</span>
        <button type="button" class="btn inc" data-type="beds">+</button>
      </div>
      <div class="resource" data-type="ventilators">
        <span>Ventilators</span>
        <button type="button" class="btn dec" data-type="ventilators">-</button>
        <span class="count" id="ventilatorsCount">${resources.ventilators}</span>
        <button type="button" class="btn inc" data-type="ventilators">+</button>
      </div>
      <div class="resource" data-type="staff">
        <span>Staff</span>
        <button type="button" class="btn dec" data-type="staff">-</button>
        <span class="count" id="staffCount">${resources.staff}</span>
        <button type="button" class="btn inc" data-type="staff">+</button>
      </div>`;
  };

  const updateLocal = data => {
    resources = { ...resources, ...data };
    render();
  };

  async function fetchResources(){
    const token = getAuthToken();
    if(!token) return;
    try{
      const res = await fetch('/api/resources',{ headers:{ 'Authorization':'Bearer '+token } });
      if(res.ok){
        const data = await res.json();
        updateLocal(data);
      }
    }catch(e){ console.error(e); }
  }

  async function saveResources(){
    const token = getAuthToken();
    if(!token) return;
    try{
      await fetch('/api/resources', {
        method:'PUT',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
        body: JSON.stringify(resources)
      });
    }catch(e){ console.error(e); }
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if(!btn) return;
    const type = btn.dataset.type;
    if(!type) return;
    const delta = btn.classList.contains('inc') ? 1 : -1;
    const newVal = (resources[type]||0) + delta;
    if(newVal < 0) return;
    resources = { ...resources, [type]: newVal };
    render();
    saveResources();
  });

  const socket = getSocket();
  if(socket){
    socket.on('resources', data => updateLocal(data));
  }

  render();
  fetchResources();
}
