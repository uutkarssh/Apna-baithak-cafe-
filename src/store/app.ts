'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type View =
  | 'home'
  | 'categories'
  | 'category-listing'
  | 'item-detail'
  | 'cart'
  | 'location'
  | 'profile'
  | 'orders'
  | 'checkout'
  | 'login'

type AppState = {
  view: View
  activeCategorySlug: string | null
  activeItemSlug: string | null
  selectedAddressId: string | null
  search: string
  _stack: View[]
  // Where the user was BEFORE they got bounced to the login screen — used by
  // LoginView to return them to where they came from after a successful login
  // (instead of always forcing them to the cart).
  loginReturnTo: View | null

  setView: (v: View) => void
  openCategory: (slug: string) => void
  openItem: (slug: string) => void
  setSelectedAddressId: (id: string | null) => void
  setSearch: (q: string) => void
  /** Navigate to login, remembering where to return to after successful auth. */
  goToLogin: (returnTo?: View) => void
  /** Called by LoginView after successful login — returns to the remembered
   *  view, or to the cart if none was remembered. Clears the field. */
  returnFromLogin: () => void
  back: () => void
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'home',
      activeCategorySlug: null,
      activeItemSlug: null,
      selectedAddressId: null,
      search: '',
      _stack: [],
      loginReturnTo: null,
      setView: (v) =>
        set((s) => (s.view === v ? {} : { view: v, _stack: [...s._stack, s.view].slice(-30) })),
      openCategory: (slug) =>
        set((s) => ({
          activeCategorySlug: slug,
          view: 'category-listing',
          _stack: [...s._stack, s.view].slice(-30),
        })),
      openItem: (slug) =>
        set((s) => ({
          activeItemSlug: slug,
          view: 'item-detail',
          _stack: [...s._stack, s.view].slice(-30),
        })),
      setSelectedAddressId: (id) => set({ selectedAddressId: id }),
      setSearch: (q) => set({ search: q }),
      goToLogin: (returnTo) =>
        set((s) => ({
          // Remember where to return to. Defaults to the current view.
          loginReturnTo: returnTo ?? s.view,
          view: 'login',
          _stack: [...s._stack, s.view].slice(-30),
        })),
      returnFromLogin: () =>
        set((s) => {
          const target = s.loginReturnTo ?? 'cart'
          return { view: target, loginReturnTo: null }
        }),
      back: () =>
        set((s) => {
          if (s._stack.length === 0) return { view: 'home' }
          const prev = s._stack[s._stack.length - 1]
          return { view: prev, _stack: s._stack.slice(0, -1) }
        }),
    }),
    {
      name: 'apna-baithak-app',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ selectedAddressId: s.selectedAddressId }),
    }
  )
)
