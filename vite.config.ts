import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import { presetIcons, presetUno } from 'unocss'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import svgLoader from 'vite-svg-loader'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    svgLoader(),
    UnoCSS({
      presets: [presetUno(), presetIcons({ cdn: 'https://esm.sh/' })],
      shortcuts: { 'flex-center': 'flex justify-center items-center' }
    }),
    AutoImport({ resolvers: [ElementPlusResolver()], eslintrc: { enabled: true }, dts: './src/auto-imports.d.ts' }),
    Components({ resolvers: [ElementPlusResolver()], dts: './src/components.d.ts' })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
