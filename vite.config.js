import {defineConfig} from 'vite';
import {assetTransport} from './src/build-asset-transport.mjs';
export default defineConfig({ plugins:[assetTransport()], optimizeDeps:{entries:['index.html']}, server:{host:'127.0.0.1',port:4173,strictPort:true}, build:{target:'es2020'} });
