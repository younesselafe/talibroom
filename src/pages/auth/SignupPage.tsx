import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2, Check, GraduationCap, Briefcase } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/LanguageContext'

type AccountType = 'student' | 'realtor'

export default function SignupPage() {
  const { t } = useLanguage()
  const [step, setStep]         = useState<0 | 1>(0)
  const [accountType, setAccountType] = useState<AccountType>('student')
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [agreed, setAgreed]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const { signUp }              = useAuthStore()
  const navigate                = useNavigate()

  const passwordValid = password.length >= 6
  const matches       = password.length > 0 && password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordValid) return toast.error(t('auth.err_password_short'))
    if (!matches)       return toast.error(t('auth.err_passwords_mismatch'))
    if (!agreed)        return toast.error(t('auth.err_terms'))
    setLoading(true)
    const referredBy = sessionStorage.getItem('talibroom_ref')
    const { error } = await signUp(email, password, fullName, accountType, referredBy)
    setLoading(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success(t('auth.account_created'))
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
            <span className="text-white font-black">T</span>
          </div>
          <span className="text-white font-black text-2xl tracking-tight">TalibRoom</span>
        </div>

        <div className="space-y-8">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl xl:text-5xl font-black text-white leading-tight text-balance"
          >
            {t('auth.student_life1')}<br />{t('auth.student_life2')}
          </motion.h2>

          <div className="space-y-3">
            {(['perk1', 'perk2', 'perk3'] as const).map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.12 }}
                className="flex items-center gap-3"
              >
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" />
                </span>
                <span className="text-white/85 font-medium">{t(key)}</span>
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
          {t('builtFor')}
        </motion.p>
      </motion.div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-[--bg]">
        <motion.div variants={stagger} initial="initial" animate="animate" className="w-full max-w-sm space-y-6">
          <motion.div variants={item} className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
              <span className="text-white font-black text-sm">T</span>
            </div>
            <span className="text-xl font-black">Talib<span className="text-primary-500">Room</span></span>
          </motion.div>

          <motion.div variants={item}>
            <h1 className="text-3xl font-black text-sand-900 dark:text-white">{t('createAccountTitle')}</h1>
            <p className="mt-1 text-sand-500 dark:text-sand-400">{t('freeForStudents')}</p>
          </motion.div>

          {/* Step 0: Account type selection */}
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                variants={item}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                className="space-y-4"
              >
                <p className="text-sm font-semibold text-sand-700 dark:text-sand-300">{t('auth.account_type_prompt')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { type: 'student' as AccountType, Icon: GraduationCap, titleKey: 'auth.account_student', descKey: 'auth.account_student_desc' },
                    { type: 'realtor' as AccountType, Icon: Briefcase,      titleKey: 'auth.account_realtor', descKey: 'auth.account_realtor_desc' },
                  ]).map(({ type, Icon, titleKey, descKey }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAccountType(type)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all',
                        accountType === type
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-sand-200 dark:border-sand-700 hover:border-sand-300',
                      )}
                    >
                      <div className={cn(
                        'rounded-xl p-2.5',
                        accountType === type ? 'bg-primary-500 text-white' : 'bg-sand-100 dark:bg-sand-800 text-sand-500',
                      )}>
                        <Icon size={22} />
                      </div>
                      <span className="text-sm font-bold text-sand-900 dark:text-white">{t(titleKey)}</span>
                      <span className="text-[11px] text-sand-500 dark:text-sand-400 leading-relaxed">{t(descKey)}</span>
                    </button>
                  ))}
                </div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button type="button" className="w-full mt-1" onClick={() => setStep(1)}>
                    {t('continue')} <ArrowRight size={18} />
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } }}
                onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t('fullName')}</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                     placeholder={t('auth.name_placeholder')} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder={t('auth.email_placeholder')} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t('password')}</Label>
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
              <Label htmlFor="confirm">{t('confirmPassword')}</Label>
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
                  {matches ? t('passwordsMatch') : t('passwordsDontMatch')}
                </motion.p>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary-500 cursor-pointer"
              />
              <span className="text-xs text-sand-500 dark:text-sand-400 leading-relaxed">
                {t('auth.terms_prefix')}{' '}
                <Link to="/terms" target="_blank" className="font-semibold text-primary-500 hover:underline">{t('auth.terms')}</Link>{' '}{t('auth.and')}{' '}
                <Link to="/privacy" target="_blank" className="font-semibold text-primary-500 hover:underline">{t('auth.privacy')}</Link>,{' '}
                {t('auth.terms_suffix')}
              </span>
            </label>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
                {t('back')}
              </Button>
              <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                <Button type="submit" disabled={loading || !agreed} className="w-full">
                  {loading ? <Loader2 size={18} className="animate-spin" />
                           : <>{t('auth.create_account_btn')} <ArrowRight size={18} /></>}
                </Button>
              </motion.div>
            </div>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.p variants={item} className="text-center text-sm text-sand-500">
            {t('haveAccount')}{' '}
            <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
              {t('signIn')}
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
