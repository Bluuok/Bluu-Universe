import {defineConfig} from 'vite';
export default defineConfig({ optimizeDeps:{entries:['index.html']}, server:{host:'127.0.0.1',port:4173,strictPort:true}, build:{target:'es2020'} });
