import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

/**
 * Landing page for the Supabase password-recovery email link. The link puts a
 * recovery session in the URL hash; supabase-js consumes it automatically, so
 * by the time the user types a new password, updateUser() just works.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    // The recovery token arrives in the URL hash; give supabase-js a moment
    // to exchange it, then verify we actually have a session to update.
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const valid = password.length >= 6 && password === confirm

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('Password must be at least 6 characters.')
    if (password !== confirm) return toast.error("Passwords don't match.")
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      setDone(true)
      toast.success('Password updated — you are signed in.')
      setTimeout(() => navigate('/'), 1500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
            <span className="text-white font-black text-sm">T</span>
          </div>
          <span className="text-xl font-black">Talib<span className="text-primary-500">Room</span></span>
        </div>

        {done ? (
          <div className="card p-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={36} className="text-emerald-500" />
            <p className="font-bold text-sand-900 dark:text-white">Password updated</p>
            <p className="text-sm text-sand-500">Taking you back to the app…</p>
          </div>
        ) : hasSession === false ? (
          <div className="card p-6 space-y-3 text-center">
            <KeyRound size={28} className="mx-auto text-sand-400" />
            <p className="font-bold text-sand-900 dark:text-white">Reset link expired</p>
            <p className="text-sm text-sand-500">
              This link is no longer valid. Request a new one from the sign-in page.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">Back to sign in</Button>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-black text-sand-900 dark:text-white">Choose a new password</h1>
              <p className="mt-1 text-sm text-sand-500 dark:text-sand-400">
                At least 6 characters — pick something you don't use elsewhere.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-pass">New password</Label>
                <div className="relative">
                  <Input
                    id="new-pass"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 transition-colors"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pass">Confirm password</Label>
                <Input
                  id="confirm-pass"
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs font-medium text-red-500">Passwords don't match</p>
                )}
              </div>

              <Button type="submit" disabled={!valid || saving} className="w-full">
                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Update password'}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
