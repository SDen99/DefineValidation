import { mount } from 'svelte';
// import Phase4Demo from './demo/Phase4Demo.svelte';
import BrushPrototype from './demo/BrushPrototype.svelte';

console.log('[V3] Mounting Brush Prototype');

const app = mount(BrushPrototype, {
	target: document.getElementById('app')!
});

console.log('[V3] Brush Prototype mounted');

export default app;
