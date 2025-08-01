import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    server: {
        allowedHosts: ['polliwog-noted-malamute.ngrok-free.app']
    },
    base: './',
})
