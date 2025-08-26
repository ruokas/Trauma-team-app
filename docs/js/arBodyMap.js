let annotations = [];

export function initARBodyMap(onChange){
  const btn = document.getElementById('btnARMode');
  if(!btn || typeof navigator === 'undefined' || !navigator.xr) return;

  // Previously we hid the AR button when immersive AR sessions weren't supported.
  // Keeping it visible allows users to try entering AR mode even on devices
  // where support detection is unreliable.

  const save = typeof onChange === 'function' ? onChange : () => {};
  let session = null;

  async function start(){
    try{
      // Request an immersive AR session with hit-test and DOM overlay support.
      session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });
      btn.classList.add('active');

      const canvas = document.createElement('canvas');
      canvas.id = 'arCanvas';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      document.body.appendChild(canvas);

      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.156.0/build/three.module.js');
      const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.156.0/examples/jsm/loaders/GLTFLoader.js');

      const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
      renderer.xr.enabled = true;
      await renderer.xr.setSession(session);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      const light = new THREE.HemisphereLight(0xffffff,0x444444);
      scene.add(light);

      const loader = new GLTFLoader();
      loader.load('assets/models/skeleton.gltf', gltf => {
        scene.add(gltf.scene);
      });

      const markerMeshes = [];
      const renderAnnotations = () => {
        markerMeshes.forEach(m=>scene.remove(m));
        markerMeshes.length = 0;
        annotations.forEach(a => {
          const geo = new THREE.SphereGeometry(0.02,16,16);
          const mat = new THREE.MeshBasicMaterial({ color:0xff0000 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(a.x, a.y, a.z);
          markerMeshes.push(mesh);
          scene.add(mesh);
        });
        };
        renderAnnotations();

        const refSpace = await session.requestReferenceSpace('local');
        const onSelect = e => {
          const pose = e.frame.getViewerPose(refSpace);
          if(!pose) return;
          const pos = pose.transform.position;
          annotations.push({ x: pos.x, y: pos.y, z: pos.z - 0.5 });
          renderAnnotations();
          save();
        };
        session.addEventListener('select', onSelect);

      renderer.setAnimationLoop((t, frame) => {
        const pose = frame.getViewerPose(refSpace);
        if (pose) {
          renderer.render(scene, camera);
        }
      });

      session.addEventListener('end', () => {
        renderer.setAnimationLoop(null);
        canvas.remove();
        btn.classList.remove('active');
        session = null;
      });
    }catch(err){
      if(err.name === 'NotSupportedError'){
        if(typeof window !== 'undefined' && typeof window.alert === 'function'){
          window.alert('AR mode is unavailable on this device.');
        }
      }else{
        console.error(err);
      }
      session = null;
      btn.classList.remove('active');
    }
  }

  btn.addEventListener('click', () => {
    if(session){
      session.end();
      session = null;
    }else{
      start();
    }
  });
}

export function serializeAR(){
  return JSON.stringify(annotations);
}

export function loadAR(raw){
  try{
    annotations = JSON.parse(raw) || [];
  }catch(e){
    annotations = [];
  }
}
