import ko from './dictionaries/ko.json'
import en from './dictionaries/en.json'
import type { Locale } from './config'

export type Dictionary = typeof ko
export type DictKey = keyof Dictionary

const dictionaries: Record<Locale, Dictionary> = { ko, en }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
