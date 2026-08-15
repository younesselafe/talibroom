import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [resetting, setResetting] = useState(false)
  const { signIn }                = useAuthStore()
  const navigate                  = useNavigate()

  const forgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Enter your email above first, then tap "Forgot password" again.')
      return
    }
    setResetting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetting(false)
    if (error) toast.error(error.message)
    else toast.success('Password reset link sent — check your inbox.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error(error)
    } else {
      navigate('/discover')
    }
  }

  const stagger = {
    animate: { transition: { staggerChildren: 0.07 } },
  }
  const item = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.5 } },
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — visual panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col justify-between relative bg-hero-gradient overflow-hidden p-12"
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-12 w-40 h-40 rounded-full bg-white/5" />

        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white font-black">T</span>
            </div>
            <span className="text-white font-black text-2xl tracking-tight">TalibRoom</span>
          </div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight text-balance">
              Find your tribe,<br />find your home.
            </h2>
            <p className="mt-4 text-white/70 text-lg max-w-sm">
              The platform built for Moroccan students. Discover roommates, browse apartments, and connect with your university community.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-3"
          >
            {['🏠 Find a flat', '🤝 Meet roommates', '🛋️ Marketplace', '💬 Community'].map((tag) => (
              <span key={tag} className="px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-sm text-white font-medium">
                {tag}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4"
          >
            <div className="flex -space-x-2">
              {['usr-002', 'usr-003', 'usr-004', 'usr-005'].map((seed) => (
                <img
                  key={seed}
                  src={`https://api.dicebear.com/8.x/notionists/svg?seed=${seed}&backgroundColor=ffffff`}
                  className="w-9 h-9 rounded-full border-2 border-primary-600 bg-primary-200"
                  alt=""
                />
              ))}
            </div>
            <p className="text-white/80 text-sm">
              <span className="font-bold text-white">+2,400</span> students already linked
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-[--bg]">
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="w-full max-w-sm space-y-6"
        >
          {/* Mobile logo */}
          <motion.div variants={item} className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
              <span className="text-white font-black text-sm">T</span>
            </div>
            <span className="text-xl font-black">Talib<span className="text-primary-500">Room</span></span>
          </motion.div>

          <motion.div variants={item}>
            <h1 className="text-3xl font-black text-sand-900 dark:text-white">Welcome back</h1>
            <p className="mt-1 text-sand-500 dark:text-sand-400">Sign in to your account</p>
          </motion.div>

          <motion.form variants={item} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-sand-700 dark:text-sand-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@student.ma"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-sand-700 dark:text-sand-300">Password</label>
                <button
                  type="button"
                  onClick={forgotPassword}
                  disabled={resetting}
                  className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors disabled:opacity-60"
                >
                  {resetting ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Sign in <ArrowRight size={18} /></>
              )}
            </motion.button>
          </motion.form>

          <motion.p variants={item} className="text-center text-sm text-sand-500">
            No account?{' '}
            <Link to="/signup" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
              Create one free
            </Link>
          </motion.p>

          {/* Demo hint */}
          <motion.div
            variants={item}
            className="rounded-xl border border-primary-100 dark:border-primary-900/30 bg-primary-50 dark:bg-primary-900/10 p-3 text-xs text-primary-700 dark:text-primary-300"
          >
            <strong>Demo mode</strong> — click Sign in with any credentials to explore the app with mock data.
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
