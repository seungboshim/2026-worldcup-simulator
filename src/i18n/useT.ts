'use client'
import { useContext } from 'react'
import { I18nContext } from './I18nProvider'
import type { DictKey } from './dictionaries'
import type { Locale } from './config'

export function useT(): { t: (key: DictKey, params?: Record<string, string | number>) => string; locale: Locale } {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within an I18nProvider')
  const { dict, locale } = ctx
  const t = (key: DictKey, params?: Record<string, string | number>): string => {
    let str: string = dict[key] ?? String(key)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return str
  }
  return { t, locale }
}
