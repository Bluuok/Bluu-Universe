import {createHash} from 'node:crypto';

// CSS-only revisions can share a JS filename. Bind visual evidence to both.
// Protected Site QA supplies its own same-origin authenticated asset reader.
export async function runtimeBuildIdentity(page,readAsset=path=>fetch(new URL(path,page.url()))){
 const bundle=await page.locator('script[src*="/assets/index-"]').getAttribute('src');
 const css=await page.locator('link[rel="stylesheet"][href*="/assets/index-"]').getAttribute('href');
 const hash=async path=>createHash('sha256').update(Buffer.from(await(await readAsset(path)).arrayBuffer())).digest('hex');
 const [sha256,cssSHA256]=await Promise.all([hash(bundle),hash(css)]);
 return{bundle,sha256,css,cssSHA256};
}
