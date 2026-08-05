import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { en, type TKey } from './en'
import { tr } from './tr'

export type Locale = 'en' | 'tr'

const DICTIONARIES: Record<Locale, Record<TKey, string>> = { en, tr }
const STORAGE_KEY = 'donebot-admin.locale'

function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'tr') return stored
  return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

type Translate = (key: TKey, vars?: Record<string, string | number>) => string

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: Translate } | null>(
  null,
)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
    setLocaleState(next)
  }, [])

  const t = useCallback<Translate>(
    (key, vars) => {
      const template = DICTIONARIES[locale][key]
      if (!vars) return template
      // Deliberately minimal: `{name}` substitution only. No plural rules, because Turkish does not
      // inflect nouns after numerals the way English does, so a shared plural abstraction would be
      // wrong in one language or the other. Where counts matter, the copy is written to work with any
      // number in both.
      return Object.entries(vars).reduce(
        (out, [name, value]) => out.replaceAll(`{${name}}`, String(value)),
        template,
      )
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useT() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useT must be used inside LocaleProvider')
  return context
}
