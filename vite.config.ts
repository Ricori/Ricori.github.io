import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from 'vite-plugin-compression';


export default defineConfig({
  build: {
    outDir: 'docs'
  },
  plugins: [react(), viteCompression({
    algorithm: 'gzip',
    ext: '.gz',
    threshold: 10240, //仅压缩大于10KB的文件
    deleteOriginFile: false //是否删除原始文件
  })]

});
