import { it, expect } from 'vitest'
import { isAdsConfigured, adsTxtContent, ADSENSE_CLIENT } from './adsense'

it('isAdsConfigured requires both client and slot', () => {
  expect(isAdsConfigured('ca-pub-1', '123')).toBe(true)
  expect(isAdsConfigured('ca-pub-1', '')).toBe(false)
  expect(isAdsConfigured('', '123')).toBe(false)
})

it('adsTxtContent emits the pub line derived from the client id', () => {
  const pub = ADSENSE_CLIENT.replace(/^ca-/, '')
  expect(adsTxtContent()).toBe(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`)
})
