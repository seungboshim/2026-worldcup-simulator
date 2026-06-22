'use client'
import { createContext, type ReactNode } from 'react'
import type { Locale } from './config'
import type { Dictionary } from './dictionaries'

export interface I18nContextValue {
  locale: Locale
  dict: Dictionary
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale
  dict: Dictionary
  children: ReactNode
}) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>
}
