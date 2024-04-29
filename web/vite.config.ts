import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react({
            jsxImportSource: '@welldone-software/why-did-you-render', // <-----
        }),
    ],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:4006',
                ws: true,
            }
        }
    }
})
