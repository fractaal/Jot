export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Jot',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    appTimezone: process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Manila',
    googleSheetId: process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY || '',
    googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    googleServiceAccountJsonB64: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 || '',
    googleServiceAccountKeyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    categories: process.env.CATEGORIES || '',
  },

  ssr: true,

  devServer: {
    port: Number(process.env.PORT) || 3210,
  },

  nitro: {
    preset: 'node-server',
  },
})
