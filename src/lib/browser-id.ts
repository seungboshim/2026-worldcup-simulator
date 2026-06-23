const KEY = 'wc-bid'

// 브라우저별 익명 UUID. 없으면 생성·저장.
export function getBrowserId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return ''
  }
}
