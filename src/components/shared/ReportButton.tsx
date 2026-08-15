import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { Flag, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ReportTarget } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/LanguageContext'

interface ReportButtonProps {
  targetType: ReportTarget
  targetId: string
  /** Owner of the reported content (drives the 5-report auto-ban). */
  reportedUserId: string | null
  /** Compact icon-only trigger (default) or an icon + "Report" label. */
  withLabel?: boolean
  className?: string
}

/**
 * A reusable "Report" control — opens a small modal to pick a reason and
 * submit. Used on profiles, posts, listings and comments.
 */
export default function ReportButton({
  targetType, targetId, reportedUserId, withLabel, className,
}: ReportButtonProps) {
  const { t } = useLanguage()

  const REASONS = [
    { key: 'spam',          label: t('shared.report.spam') },
    { key: 'harassment',    label: t('shared.report.harassment') },
    { key: 'inappropriate', label: t('shared.report.inappropriate') },
    { key: 'fake',          label: t('shared.report.fake') },
    { key: 'other',         label: t('shared.report.other') },
  ]

  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>('spam')
  const [note, setNote] = useState('')

  const submit = useMutation({
    mutationFn: () => api.createReport({
      targetType,
      targetId,
      reportedUserId,
      reason: note.trim() ? `${reason} — ${note.trim()}` : reason,
    }),
    onSuccess: () => {
      toast.success(t('shared.report.toast'))
      setOpen(false)
      setNote('')
    },
    onError: (e: Error) => toast.error(e.message || t('shared.report.error')),
  })

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        aria-label={t('shared.report.label')}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-semibold text-sand-400 transition-colors hover:text-red-500',
          className,
        )}
      >
        <Flag size={14} />
        {withLabel && t('shared.report.label')}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-[#16201E]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-black text-sand-900 dark:text-white">
                      {t('shared.report.title')} {targetType}
                    </h2>
                    <p className="mt-0.5 text-xs text-sand-400">
                      {t('shared.report.disclaimer')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="btn-ghost -mr-2 -mt-1"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-4 space-y-1.5">
                  {REASONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReason(key)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                        reason === key
                          ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300'
                          : 'border-sand-200 text-sand-600 dark:border-[#2F3B39] dark:text-sand-300',
                      )}
                    >
                      <span
                        className={cn(
                          'h-3.5 w-3.5 flex-shrink-0 rounded-full border-2',
                          reason === key ? 'border-primary-500 bg-primary-500' : 'border-sand-300',
                        )}
                      />
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={t('shared.report.placeholder')}
                  className="input-field mt-3 w-full resize-none text-sm"
                />

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={submit.isPending}
                    onClick={() => submit.mutate()}
                  >
                    {submit.isPending
                      ? <Loader2 size={16} className="animate-spin" />
                      : t('shared.report.submit')}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
