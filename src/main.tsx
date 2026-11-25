import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MotionConfig, MotionGlobalConfig } from 'motion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/600.css'
import '@fontsource/lora/500-italic.css'
import 'lenis/dist/lenis.css'
import './index.css'
import './styles/app.css'
import App from './App.tsx'
import { LanguageProvider } from './components/LanguageProvider.tsx'

// reducedMotion="user" only drops transforms; with reduced motion every reveal should simply be there, so finish fades instantly too.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
MotionGlobalConfig.instantAnimations = reduceMotion.matches
reduceMotion.addEventListener('change', (event) => {
  MotionGlobalConfig.instantAnimations = event.matches
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

// Dev only: `?__demo=1` signs in the demo traveler for automated checks (see src/dev/demoSeed.ts); the page reloads itself.
const seeding = import.meta.env.DEV && new URLSearchParams(location.search).has('__demo')
if (seeding) void import('./dev/demoSeed').then(({ seedDemo }) => seedDemo())
else createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>,
)
