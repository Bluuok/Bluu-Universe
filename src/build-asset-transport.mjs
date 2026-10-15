import {mkdir,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Preserve original source assets. Only generated output uses bounded parts,
// reassembled and checked byte-for-byte before Three decodes the same image.
export function assetTransport(){
 let config;
 return {name:'lossless-asset-transport',apply:'build',configResolved(value){config=value;},async closeBundle(){
  const root=path.resolve(config.root),output=path.resolve(root,config.build.outDir),source=path.resolve(config.publicDir);
  if(!output.startsWith(root+path.sep))throw Error('Asset transport output must remain inside the project');
  const chunkSize=4*1024*1024,manifest={version:1,assets:{}};
  async function visit(folder){for(const item of await readdir(folder,{withFileTypes:true})){
   const file=path.join(folder,item.name);if(item.isDirectory()){await visit(file);continue;}
   if(!item.name.endsWith('.png'))continue;
   const bytes=await readFile(file);if(bytes.length<=chunkSize)continue;
   const relative=path.relative(source,file).split(path.sep).join('/'),sha256=createHash('sha256').update(bytes).digest('hex'),parts=[];
   for(let offset=0,index=0;offset<bytes.length;offset+=chunkSize,index++){
    const part=bytes.subarray(offset,offset+chunkSize),url=`/assets/transport/${sha256.slice(0,16)}/${String(index).padStart(3,'0')}.part`,destination=path.join(output,url.slice(1));
    await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,part);parts.push({url,bytes:part.length});
   }
   manifest.assets['/'+relative]={bytes:bytes.length,sha256,mime:'image/png',parts};
   // Delete only this generated copy; public/ and its Git history stay intact.
   await rm(path.join(output,relative));
  }}
  await visit(source);await mkdir(path.join(output,'assets'),{recursive:true});await writeFile(path.join(output,'assets/transport.json'),JSON.stringify(manifest));
 }};
}
