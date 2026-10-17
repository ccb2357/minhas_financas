import { defineConfig } from 'vite';

const backend = {
    target: 'http://nginx',
    changeOrigin: true,
    headers: {
        Host: 'minhas-financas.localhost',
    },
};

export default defineConfig({
    server: {
        proxy: {
            '/api': { ...backend },
            '/sanctum': { ...backend },
            '/up': { ...backend },
        },
    },
});