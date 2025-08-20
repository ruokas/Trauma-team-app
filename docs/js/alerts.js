const handlers = {};
const queue = [];
let processing = false;

export function register(type, handler){
  handlers[type] = handler;
}

export function notify(options){
  return new Promise(resolve => {
    queue.push({ ...options, resolve });
    processQueue();
  });
}

async function processQueue(){
  if(processing) return;
  processing = true;
  while(queue.length){
    const item = queue.shift();
    const handler = handlers[item.type] || handlers.toast;
    if(typeof handler === 'function'){
      try{
        const result = handler(item);
        if(result && typeof result.then === 'function'){
          item.resolve(await result);
        }else{
          item.resolve(result);
        }
      }catch(e){
        console.error(e);
        item.resolve();
      }
    }else{
      item.resolve();
    }
  }
  processing = false;
}
