import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, MapPin, GraduationCap,
  Wallet, Sparkles, Loader2, PartyPopper,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { MOROCCAN_CITIES, MOROCCAN_UNIVERSITIES } from '@/types'
import type { GenderEnum, LifestyleVec } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

type Draft = {
  city: string
  university: string
  gender: GenderEnum | ''
  budget: number
  lifestyle: LifestyleVec
}

const TOTAL_STEPS = 4

// ─── Choice card (used by lifestyle quiz) ──────────────────────────────────────

function ChoiceCard({
  active, emoji, label, onClick,
}: { active: boolean; emoji: string; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors',
        active
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-sand-200 dark:border-[#3A3A36] hover:border-primary-300'
      )}
    >
      <span className="text-3xl">{emoji}</span>
      <span className={cn(
        'text-sm font-semibold',
        active ? 'text-primary-600 dark:text-primary-400' : 'text-sand-600 dark:text-sand-300'
      )}>
        {label}
      </span>
    </motion.button>
  )
}

function QuizRow({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-sand-700 dark:text-sand-300">{question}</p>
      <div className="flex gap-3">{children}</div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAuthStore()

  const [step, setStep]       = useState(0)
  const [direction, setDir]   = useState(1)
  const [saving, setSaving]   = useState(false)
  const [draft, setDraft]     = useState<Draft>({
    city: profile?.city ?? '',
    university: profile?.university ?? '',
    gender: profile?.gender ?? '',
    budget: profile?.budget ?? 2000,
    lifestyle: profile?.lifestyle_vec ?? {},
  })

  const setLifestyle = (patch: Partial<LifestyleVec>) =>
    setDraft((d) => ({ ...d, lifestyle: { ...d.lifestyle, ...patch } }))

  const canAdvance = [
    true,
    draft.city !== '' && draft.university !== '',
    draft.gender !== '' && draft.budget > 0,
    true,
  ][step]

  const go = (dir: 1 | -1) => {
    setDir(dir)
    setStep((s) => Math.min(Math.max(s + dir, 0), TOTAL_STEPS - 1))
  }

  const finish = async () => {
    setSaving(true)
    await updateProfile({
      city: draft.city,
      university: draft.university,
      gender: draft.gender || null,
      budget: draft.budget,
      lifestyle_vec: draft.lifestyle,
    })
    toast.success('Welcome to MoRoom! 🎉')
    navigate('/discover')
  }

  const slide = {
    initial: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    animate: { opacity: 1, x: 0 },
    exit:    (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  }

  return (
    <div className="min-h-screen flex flex-col bg-[--bg]">
      {/* Top bar */}
      <div className="px-6 pt-6 max-w-lg w-full mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">M</span>
            </div>
            <span className="font-black">Mo<span className="text-primary-500">Room</span></span>
          </div>
          <span className="text-xs font-semibold text-sand-400">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slide}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* STEP 0 — Welcome */}
              {step === 0 && (
                <div className="text-center space-y-6">
                  <motion.div
                    animate={{ rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-6xl"
                  >
                    👋
                  </motion.div>
                  <div>
                    <h1 className="text-3xl font-black text-sand-900 dark:text-white text-balance">
                      Salam{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
                    </h1>
                    <p className="mt-2 text-sand-500 dark:text-sand-400">
                      Let's build your profile so we can match you with the right roommates and the right home. Takes 60 seconds.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                      { icon: MapPin, label: 'Location' },
                      { icon: Wallet, label: 'Budget' },
                      { icon: Sparkles, label: 'Lifestyle' },
                    ].map(({ icon: Icon, label }, i) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="card p-4 flex flex-col items-center gap-2"
                      >
                        <Icon size={20} className="text-primary-500" />
                        <span className="text-xs font-semibold text-sand-500">{label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 1 — Location */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <GraduationCap className="text-primary-500 mb-3" size={28} />
                    <h1 className="text-2xl font-black text-sand-900 dark:text-white">
                      Where do you study?
                    </h1>
                    <p className="mt-1 text-sand-500 dark:text-sand-400">
                      We'll show you roommates and apartments nearby.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Select value={draft.city} onValueChange={(v) => setDraft((d) => ({ ...d, city: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select your city" /></SelectTrigger>
                      <SelectContent>
                        {MOROCCAN_CITIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>University</Label>
                    <Select value={draft.university} onValueChange={(v) => setDraft((d) => ({ ...d, university: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select your university" /></SelectTrigger>
                      <SelectContent>
                        {MOROCCAN_UNIVERSITIES.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* STEP 2 — Gender + Budget */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <Wallet className="text-primary-500 mb-3" size={28} />
                    <h1 className="text-2xl font-black text-sand-900 dark:text-white">
                      A bit about you
                    </h1>
                    <p className="mt-1 text-sand-500 dark:text-sand-400">
                      This helps us match compatible roommates.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>I identify as</Label>
                    <div className="flex gap-3">
                      {(['female', 'male', 'other'] as GenderEnum[]).map((g) => (
                        <ChoiceCard
                          key={g}
                          active={draft.gender === g}
                          emoji={g === 'female' ? '👩' : g === 'male' ? '👨' : '🧑'}
                          label={g === 'female' ? 'Woman' : g === 'male' ? 'Man' : 'Other'}
                          onClick={() => setDraft((d) => ({ ...d, gender: g }))}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Monthly budget</Label>
                      <span className="text-sm font-black text-primary-600 dark:text-primary-400">
                        {formatPrice(draft.budget)}
                      </span>
                    </div>
                    <input
                      type="range" min={800} max={6000} step={100}
                      value={draft.budget}
                      onChange={(e) => setDraft((d) => ({ ...d, budget: Number(e.target.value) }))}
                      className="w-full accent-primary-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-sand-400">
                      <span>800 DH</span><span>6 000 DH</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 — Lifestyle */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <Sparkles className="text-primary-500 mb-3" size={28} />
                    <h1 className="text-2xl font-black text-sand-900 dark:text-white">
                      Your lifestyle
                    </h1>
                    <p className="mt-1 text-sand-500 dark:text-sand-400">
                      Honest answers = better matches.
                    </p>
                  </div>

                  <QuizRow question="When are you most active?">
                    <ChoiceCard active={draft.lifestyle.sleep_time === 'early'}
                      emoji="🌅" label="Early bird"
                      onClick={() => setLifestyle({ sleep_time: 'early' })} />
                    <ChoiceCard active={draft.lifestyle.sleep_time === 'night_owl'}
                      emoji="🦉" label="Night owl"
                      onClick={() => setLifestyle({ sleep_time: 'night_owl' })} />
                  </QuizRow>

                  <QuizRow question="How do you study?">
                    <ChoiceCard active={draft.lifestyle.study_style === 'quiet'}
                      emoji="🤫" label="Quiet"
                      onClick={() => setLifestyle({ study_style: 'quiet' })} />
                    <ChoiceCard active={draft.lifestyle.study_style === 'social'}
                      emoji="💬" label="Social"
                      onClick={() => setLifestyle({ study_style: 'social' })} />
                  </QuizRow>

                  <QuizRow question="Your space is usually...">
                    <ChoiceCard active={draft.lifestyle.cleanliness === 'tidy'}
                      emoji="✨" label="Spotless"
                      onClick={() => setLifestyle({ cleanliness: 'tidy' })} />
                    <ChoiceCard active={draft.lifestyle.cleanliness === 'relaxed'}
                      emoji="😌" label="Relaxed"
                      onClick={() => setLifestyle({ cleanliness: 'relaxed' })} />
                  </QuizRow>

                  <div className="flex items-center justify-between card p-4">
                    <div>
                      <p className="text-sm font-semibold text-sand-700 dark:text-sand-300">Smoker</p>
                      <p className="text-xs text-sand-400">Do you smoke indoors?</p>
                    </div>
                    <Switch
                      checked={!!draft.lifestyle.smoking}
                      onCheckedChange={(v) => setLifestyle({ smoking: v })}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="px-6 pb-8 max-w-lg w-full mx-auto">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => go(-1)} className="px-4">
              <ArrowLeft size={18} />
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
              <Button onClick={() => go(1)} disabled={!canAdvance} className="w-full">
                Continue <ArrowRight size={18} />
              </Button>
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
              <Button onClick={finish} disabled={saving} className="w-full">
                {saving ? <Loader2 size={18} className="animate-spin" />
                        : <>Enter MoRoom <PartyPopper size={18} /></>}
              </Button>
            </motion.div>
          )}
        </div>
        {step === 0 && (
          <button
            onClick={finish}
            className="w-full mt-3 text-xs font-medium text-sand-400 hover:text-sand-600 transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
