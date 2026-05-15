import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import Router from './router'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const isDark     = useUIStore((s) => s.isDark)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return <Router />
}
