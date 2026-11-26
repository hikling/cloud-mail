import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import {execSync} from 'node:child_process'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import {VitePWA} from 'vite-plugin-pwa';

function resolveGitVersion() {
    const envTag = process.env.GITHUB_REF_TYPE === 'tag' ? (process.env.GITHUB_REF_NAME || '').trim() : ''
    const envSha = (
        process.env.WORKERS_CI_COMMIT_SHA
        || process.env.CF_PAGES_COMMIT_SHA
        || process.env.GITHUB_SHA
        || ''
    ).trim()

    let gitTag = envTag
    let gitSha = envSha ? envSha.slice(0, 7) : ''

    if (!gitTag) {
        try {
            gitTag = execSync('git describe --tags --exact-match', {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim()
        } catch {}
    }
    if (!gitSha) {
        try {
            gitSha = execSync('git rev-parse --short HEAD', {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim()
        } catch {}
    }

    return { gitTag, gitSha }
}

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), 'VITE')
    const { gitTag, gitSha } = resolveGitVersion()
    return {
        define: {
            __APP_GIT_TAG__: JSON.stringify(gitTag),
            __APP_GIT_SHA__: JSON.stringify(gitSha),
        },
        server: {
            host: true,
            port: 3001,
            hmr: true,
        },
        base: env.VITE_STATIC_URL || '/',
        plugins: [vue(),
            VitePWA({
                injectRegister: 'script-defer',
                manifest: {
                    name: env.VITE_PWA_NAME,
                    short_name: env.VITE_PWA_NAME,
                    background_color: '#FFFFFF',
                    theme_color: '#FFFFFF',
                    icons: [
                        {
                            src: 'mail-pwa.png',
                            sizes: '192x192',
                            type: 'image/png',
                        }
                    ],
                },
                workbox: {
                    disableDevLogs: true,
                    globPatterns: [],
                    runtimeCaching: [],
                    navigateFallback: null,
                    cleanupOutdatedCaches: true,
                }
            }),
            AutoImport({
                resolvers: [ElementPlusResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver()],
            })
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        },
        build: {
            target: 'es2022',
            outDir: env.VITE_OUT_DIR || 'dist',
            emptyOutDir: true,
            assetsInclude: ['**/*.json']
        }
    }
})
