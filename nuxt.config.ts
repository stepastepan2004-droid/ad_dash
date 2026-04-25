export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/fonts',
  ],

  fonts: {
    families: [
      { name: 'DM Sans', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 600] },
    ],
  },

  css: ['~/assets/css/main.css'],

  icon: {
    serverBundle: 'local',
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
      icons: [
        'lucide:chevron-down',
        'lucide:chevron-left',
        'lucide:chevron-right',
        'lucide:check',
        'lucide:x',
        'lucide:search',
        'lucide:loader-2',
        'lucide:download',
        'lucide:sun',
        'lucide:moon',
        'lucide:shopping-cart',
        'lucide:megaphone',
        'lucide:trash-2',
        'lucide:refresh-cw',
        'lucide:bar-chart-3',
        'lucide:upload',
        'lucide:settings',
      ],
    },
  },
  nitro: {
    preset: 'bun',
  },

  routeRules: {
    '/api/_nuxt_icon/**': { proxy: false },
    '/api/**': {
      proxy: 'http://localhost:3001/api/**',
    },
  },
  vite: {
    server: {
      allowedHosts: ['front-dev.nebusfinance.ru']
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@unovis/vue',
      ]
    }
  }
})
