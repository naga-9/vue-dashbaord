// Translations (overall.md 11). English is built in; the host can add languages or override texts:
// createDashboard({ locale: 'fr', messages: { fr: { 'common.save': 'Enregistrer' } } })
import { ref } from 'vue'
import en from './messages.en.js'

export function createI18n({ locale = 'en', messages = {} } = {}) {
  const current = ref(locale)
  const all = { ...messages, en: { ...en, ...messages.en } }

  function t(key, params) {
    const text = all[current.value]?.[key] ?? all.en[key] ?? key
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
  }

  return {
    locale: current,
    t,
    setLocale(value) {
      current.value = value
    },
    addMessages(lang, texts) {
      all[lang] = { ...all[lang], ...texts }
    },
  }
}
