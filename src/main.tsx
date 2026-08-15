import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import { queryClient } from './lib/queryClient'
import { LanguageProvider } from './lib/LanguageContext'
import './lib/i18n' // initialise i18next before first render
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              borderRadius: '12px',
            },
          }}
          richColors
        />
      </QueryClientProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
