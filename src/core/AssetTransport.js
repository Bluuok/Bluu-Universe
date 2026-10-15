// Hosting transports large images in bounded files. Pixels and source bytes
// remain unchanged; a missing or corrupted part fails the existing load flow.
let manifestPromise;
async function manifest(){
 manifestPromise ||= fetch('/assets/transport.json').then(async response=>{
  if(!response.ok)throw Error('Asset transport manifest HTTP '+response.status);
  const value=await response.json();if(value.version!==1||!value.assets)throw Error('Invalid asset transport manifest');return value.assets;
 }).catch(error=>{manifestPromise=null;throw error;});
 return manifestPromise;
}
export async function assembleAsset(entry,fetcher=fetch){
 if(!Number.isSafeInteger(entry.bytes)||entry.bytes<=0||entry.bytes>128*1024*1024||!Array.isArray(entry.parts)||!entry.parts.length||entry.parts.length>64)throw Error('Invalid asset parts');
 const parts=await Promise.all(entry.parts.map(async part=>{
  if(!/^\/assets\/transport\/[a-f0-9]{16}\/\d{3}\.part$/.test(part.url))throw Error('Invalid asset part URL');
  const response=await fetcher(part.url);if(!response.ok)throw Error('Asset part HTTP '+response.status);
  const bytes=await response.arrayBuffer();if(bytes.byteLength!==part.bytes)throw Error('Asset part length mismatch');return new Uint8Array(bytes);
 }));
 const bytes=new Uint8Array(entry.bytes);let offset=0;
 for(const part of parts){if(offset+part.length>bytes.length)throw Error('Asset length mismatch');bytes.set(part,offset);offset+=part.length;}
 if(offset!==bytes.length)throw Error('Asset length mismatch');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
 if(hash!==entry.sha256)throw Error('Asset checksum mismatch');return bytes;
}
export async function loadTextureAsset(loader,url,{transport=import.meta.env?.PROD===true}={}){
 if(!transport)return loader.loadAsync(url);
 const entry=(await manifest())[decodeURI(new URL(url,location.href).pathname)];if(!entry)return loader.loadAsync(url);
 const bytes=await assembleAsset(entry),objectURL=URL.createObjectURL(new Blob([bytes],{type:entry.mime}));
 try{return await loader.loadAsync(objectURL);}finally{URL.revokeObjectURL(objectURL);}
}
