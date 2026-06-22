import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultLocale, locales } from '@/i18n/config'

function hasLocalePrefix(pathname: string): boolean {
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (hasLocalePrefix(pathname)) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Skip Next internals, static assets, fonts, and any file with an extension.
  matcher: ['/((?!_next|fonts|favicon.ico|.*\\.).*)'],
}
