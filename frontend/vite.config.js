import { defineConfig } from "vite";
import { minhasFinancasPwa } from "./build/pwa-plugin.js";

const backend = {
    target: "http://nginx",
    changeOrigin: true,
    headers: {
        Host: "minhas-financas.localhost",
    },
};

export default defineConfig({
    plugins: [minhasFinancasPwa()],
    server: {
        watch: {
            usePolling: true,
            interval: 300,
        },
        proxy: {
            "/api": { ...backend },
            "/sanctum": { ...backend },
            "/up": { ...backend },
        },
    },
});
