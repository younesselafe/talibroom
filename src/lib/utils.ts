import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import { MOROCCAN_CITIES } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  return format(new Date(date), pattern)
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(price)
}

/** Compact budget for tight UI — 2500 → "2.5k", 800 → "800". */
export function formatBudgetShort(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return String(amount)
}

/** Trim a long university name to its distinctive part for tight UI cells. */
export function shortUniversity(name: string): string {
  let s = name
    .replace(/^Université\s+/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
  for (const city of MOROCCAN_CITIES) {
    if (s.endsWith(` de ${city}`)) {
      s = s.slice(0, -` de ${city}`.length)
      break
    }
  }
  return s.trim() || name
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export const LIFESTYLE_LABELS: Record<string, string> = {
  early: '🌅 Early bird',
  night_owl: '🦉 Night owl',
  quiet: '🤫 Quiet',
  social: '💬 Social',
  tidy: '✨ Tidy',
  relaxed: '😌 Relaxed',
  halal: '🌙 Halal',
  vegetarian: '🥗 Vegetarian',
  any: '🍽️ Any diet',
}
