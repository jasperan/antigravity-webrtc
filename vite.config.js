import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: 'src/mobile',
    build: {
        outDir: '../../dist/mobile',
        emptyOutDir: true
    },
    server: {
        port: 3001,
        proxy: {
            '/api': 'http://localhost:3000',
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/mobile')
        }
    }
});
