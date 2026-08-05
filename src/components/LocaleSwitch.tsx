import { useT } from '../i18n'

export function LocaleSwitch() {
  const { locale, setLocale } = useT()
  return (
    <button
      className="btn"
      onClick={() => setLocale(locale === 'en' ? 'tr' : 'en')}
      aria-label="Language"
      style={{ padding: '4px 12px', fontSize: 12 }}
    >
      {locale === 'en' ? 'TR' : 'EN'}
    </button>
  )
}
