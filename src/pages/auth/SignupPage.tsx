import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PERKS = [
  'Match with verified student roommates',
  'Browse 100% scam-free apartments',
  'Buy & sell second-hand on campus',
]

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { signUp }              = useAuthStore()
  const navigate                = useNavigate()

  const passwordValid = password.length >= 6
  const matches       = password.length > 0 && password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordValid) return toast.error('Password must be at least 6 characters')
    if (!matches)       return toast.error('Passwords do not match')
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Account created — let\'s set up your profile')
      navigate('/onboarding')
    }
  }

  const stagger = { animate: { transition: { staggerChildren: 0.07 } } }
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
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-white/5" />

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-white font-black">M</span>
          </div>
          <span className="text-white font-black text-2xl tracking-tight">MoRoom</span>
        </div>

        <div className="space-y-8">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl xl:text-5xl font-black text-white leading-tight text-balance"
          >
            Your student life,<br />all in one place.
          </motion.h2>

          <div className="space-y-3">
            {PERKS.map((perk, i) => (
              <motion.div
                key={perk}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.12 }}
                className="flex items-center gap-3"
              >
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" />
                </span>
                <span className="text-white/85 font-medium">{perk}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-white/50 text-sm"
        >
          Built for Moroccan universities · Casablanca · Rabat · Marrakech · Fès
        </motion.p>
      </motion.div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-[--bg]">
        <motion.div variants={stagger} initial="initial" animate="animate" className="w-full max-w-sm space-y-6">
          <motion.div variants={item} className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <span className="text-xl font-black">Mo<span className="text-primary-500">Room</span></span>
          </motion.div>

          <motion.div variants={item}>
            <h1 className="text-3xl font-black text-sand-900 dark:text-white">Create your account</h1>
            <p className="mt-1 text-sand-500 dark:text-sand-400">Free for every student. Always.</p>
          </motion.div>

          <motion.form variants={item} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                     placeholder="Youssef El Amrani" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="you@student.ma" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPass ? 'text' : 'password'} value={password}
                       onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                       className="pr-12" required />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type={showPass ? 'text' : 'password'} value={confirm}
                     onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                     className={cn(confirm.length > 0 && !matches && 'border-red-400 focus-visible:ring-red-400/30')}
                     required />
              {confirm.length > 0 && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={cn('text-xs font-medium', matches ? 'text-emerald-500' : 'text-red-500')}
                >
                  {matches ? '✓ Passwords match' : 'Passwords don\'t match yet'}
                </motion.p>
              )}
            </div>

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button type="submit" disabled={loading} className="w-full mt-1">
                {loading ? <Loader2 size={18} className="animate-spin" />
                         : <>Create account <ArrowRight size={18} /></>}
              </Button>
            </motion.div>
          </motion.form>

          <motion.p variants={item} className="text-center text-sm text-sand-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
              Sign in
            </Link>
          </motion.p>

          <motion.p variants={item} className="text-center text-xs text-sand-400">
            By signing up you agree to MoRoom's Terms & Privacy Policy.
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
