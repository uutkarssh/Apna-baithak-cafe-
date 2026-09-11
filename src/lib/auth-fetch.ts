'use client'

import { getSupabaseBrowser } from '@/lib/supabase-client'

/**
 * Returns an Authorization header with the current user's access token,
 * or an empty object if not logged in. Use this with fetch() calls to
 * API routes that need the user's session (the browser Supabase client
 * stores the session in localStorage, not cookies).
 *
 * Usage:
 *   const res = await fetch('/api/orders', { headers: { ...authHeaders() } })
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowser()
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) return {}
  return { Authorization: `Bearer ${data.session.access_token}` }
}

/**
 * Authenticated fetch — automatically attaches the Authorization header.
 * Same API as window.fetch.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = await authHeaders()
  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...headers,
    },
  })
}
