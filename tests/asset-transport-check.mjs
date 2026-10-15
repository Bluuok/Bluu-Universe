import {readFile,writeFile,readdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {assembleAsset,loadTextureAsset} from '../src/core/AssetTransport.js';
const base=process.env.TRANSPORT_URL||'http://127.0.0.1:4259/',response=await fetch(new URL('/assets/transport.json',base));assert.ok(response.ok);const manifest=await response.json(),checks=[];
const nativeFetch=globalThis.fetch;globalThis.location={href:base};globalThis.fetch=(url,options)=>nativeFetch(new URL(url,base),options);
for(const [url,entry]of Object.entries(manifest.assets)){
 const fetcher=part=>fetch(new URL(part,base)),bytes=await assembleAsset(entry,fetcher),original=await readFile('public'+url);assert.deepEqual(Buffer.from(bytes),original);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.ok(entry.parts.every(p=>p.bytes<=4*1024*1024));
 await assert.rejects(()=>assembleAsset(entry,async()=>new Response('',{status:503})),/HTTP 503/);
 await assert.rejects(()=>assembleAsset(entry,async()=>new Response(new Uint8Array(1))),/length mismatch/);
 let damaged=false;await assert.rejects(()=>assembleAsset(entry,async part=>{const r=await fetcher(part),b=new Uint8Array(await r.arrayBuffer());if(!damaged){b[0]^=1;damaged=true;}return new Response(b);}),/checksum mismatch/);
 let blobURL;const loader={loadAsync:async address=>{blobURL=address;assert.ok(address.startsWith('blob:'));return Buffer.from(await(await nativeFetch(address)).arrayBuffer());}};
 for(const address of [url,encodeURI(url)]){const loaded=await loadTextureAsset(loader,address,{transport:true});assert.deepEqual(loaded,original);await assert.rejects(()=>nativeFetch(blobURL));}
 checks.push({url,loaderUnicodeAndEncodedURL:true,blobRevoked:true,bytes:bytes.length,sha256:entry.sha256,parts:entry.parts.length,identical:true,missingAndCorruptRejected:true});
}
globalThis.fetch=nativeFetch;delete globalThis.location;assert.equal(checks.length,2);
const notices=await readdir('licenses');for(const file of notices)assert.deepEqual(Buffer.from(await(await fetch(new URL('/licenses/'+file,base))).arrayBuffer()),await readFile('licenses/'+file));const report={at:new Date().toISOString(),method:'HTTP parts assembled by actual runtime helper, compared byte-for-byte with unchanged source PNGs; missing, truncated and same-length corrupted part rejection tested. Not GPU visual acceptance.',status:'passed',checks,licenseFilesIdentical:notices.length};await writeFile(process.env.TRANSPORT_REPORT||'tests/v21-transport.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
