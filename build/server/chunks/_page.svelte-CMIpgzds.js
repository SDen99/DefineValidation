import { d as ao } from './error.svelte-CKHCWD04.js';
import { P as Pe } from './dataState.svelte-CcHf5luB.js';

function s(s,d){s.component(s=>{const d=Pe();s.push('<div class="flex h-full flex-col items-center justify-center p-8"><div class="max-w-2xl text-center"><h1 class="mb-4 text-3xl font-bold text-foreground">Clinical Datasets</h1> '),d.length>0?(s.push("\x3c!--[--\x3e"),s.push(`<p class="mb-6 text-lg text-muted-foreground">Select a dataset from the left sidebar to view its data, metadata, and VLM information.</p> <div class="rounded-lg border border-border bg-muted/30 p-6"><p class="text-sm text-muted-foreground"><strong>${ao(d.length)}</strong> dataset${ao(1===d.length?"":"s")} loaded</p></div>`)):(s.push("\x3c!--[!--\x3e"),s.push('<p class="mb-6 text-lg text-muted-foreground">No datasets loaded yet. Upload a .sas7bdat file or Define-XML to get started.</p> <div class="rounded-lg border border-border bg-muted/30 p-6"><p class="text-sm text-muted-foreground">Supported formats: .sas7bdat, .xpt, .xml</p></div>')),s.push("\x3c!--]--\x3e</div></div>");});}

export { s as default };
//# sourceMappingURL=_page.svelte-CMIpgzds.js.map
