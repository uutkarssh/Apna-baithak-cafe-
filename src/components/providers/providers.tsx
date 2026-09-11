'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AuthProvider } from '@/components/providers/auth-provider'
import { getSupabaseBrowser } from '@/lib/supabase-client'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  useEffect(() => {
    const handleReceiptClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest<HTMLAnchorElement>('a[href*="/api/orders/"][href$="/receipt"]')
      if (!anchor) return

      const url = new URL(anchor.href, window.location.origin)
      if (url.searchParams.get('admin') === '1') return

      event.preventDefault()

      try {
        const response = await authedFetch(`${url.pathname}${url.search}`)
        if (!response.ok) {
          let message = 'Failed to download receipt.'
          try {
            const data = await response.json()
            if (typeof data?.error === 'string') message = data.error
          } catch {
            // Keep the generic download error when the response is not JSON.
          }
          window.alert(message)
          return
        }

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        const disposition = response.headers.get('Content-Disposition') || ''
        const filenameMatch = disposition.match(/filename="([^"]+)"/i)
        const filename = filenameMatch?.[1] || 'receipt.pdf'

        const download = document.createElement('a')
        download.href = objectUrl
        download.download = filename
        document.body.appendChild(download)
        download.click()
        download.remove()
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      } catch (error) {
        console.error('Receipt download failed:', error)
        window.alert('Failed to download receipt. Please try again.')
      }
    }

    document.addEventListener('click', handleReceiptClick)
    return () => document.removeEventListener('click', handleReceiptClick)
  }, [])

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

/**
 * Attaches the Supabase access token to a fetch call. Used by useQuery
 * queryFn's that hit protected API routes (addresses, orders, checkout).
 *
 * Waits up to 2 seconds for the session to be ready before firing — this
 * eliminates the "log in again on every page" loop that happened when
 * getSession() returned null on the first tick after a page reload (the
 * supabase ssr cookie client takes a moment to hydrate from cookies).
 *
 * Once the @supabase/ssr cookie-based session is in place, the server
 * can also read the session from cookies directly, so even if the
 * Authorization header is missing the user is still authenticated.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = getSupabaseBrowser()

  // First try: maybe session is already hydrated
  let { data } = await supabase.auth.getSession()
  let token = data.session?.access_token

  // If not, wait briefly and retry — the cookie-based client may need a tick
  if (!token) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const retry = await supabase.auth.getSession()
    token = retry.data.session?.access_token
  }

  // Cookies-based auth fallback: @supabase/ssr sets cookies that the
  // server-side getSupabaseForUser() reads automatically. So even if the
  // access token is null here (race), the server may still authenticate
  // the request via cookies. Pass the token if we have it; rely on
  // cookies otherwise.
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
