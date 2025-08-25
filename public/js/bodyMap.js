import BodyMap from './components/BodyMap.js';
import { TOOLS } from './BodyMapTools.js';

const bodyMap = new BodyMap();

export default bodyMap;
export { bodyMap, TOOLS };

// Legacy named exports
export const initBodyMap = (...args) => bodyMap.init(...args);
export const addMark = (...args) => bodyMap.addMark(...args);
export const serialize = (...args) => bodyMap.serialize(...args);
export const load = (...args) => bodyMap.load(...args);
export const counts = (...args) => bodyMap.counts(...args);
export const zoneCounts = (...args) => bodyMap.zoneCounts(...args);
