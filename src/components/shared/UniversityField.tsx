import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { MOROCCAN_UNIVERSITIES } from '@/types'
import { useLanguage } from '@/lib/LanguageContext'

const OTHER = '__other__'

interface Props {
  value: string
  onChange: (v: string) => void
}

/** University picker with a manual fallback for schools not on the list. */
export default function UniversityField({ value, onChange }: Props) {
  const { t } = useLanguage()
  const isKnown = (MOROCCAN_UNIVERSITIES as readonly string[]).includes(value)
  const [manual, setManual] = useState(value !== '' && !isKnown)

  if (manual) {
    return (
      <div className="space-y-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('university_placeholder')}
        />
        <button
          type="button"
          onClick={() => { setManual(false); onChange('') }}
          className="text-xs font-semibold text-primary-500 hover:underline"
        >
          {t('choose_from_list')}
        </button>
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={(v) => (v === OTHER ? setManual(true) : onChange(v))}>
      <SelectTrigger><SelectValue placeholder={t('selectUniversity')} /></SelectTrigger>
      <SelectContent>
        {MOROCCAN_UNIVERSITIES.map((u) => (
          <SelectItem key={u} value={u}>{u}</SelectItem>
        ))}
        <SelectItem value={OTHER}>{t('university_other')}</SelectItem>
      </SelectContent>
    </Select>
  )
}
