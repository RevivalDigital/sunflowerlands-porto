import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import pb from '@/lib/pb'
import type { User, Farm, DashboardStats, NotificationItem } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  refreshAuth: () => void
}

interface AppStore {
  currentFarm: Farm | null
  farms: Farm[]
  stats: DashboardStats | null
  notifications: NotificationItem[]
  sidebarOpen: boolean
  sflPriceUsd:   number | null
  polPriceUsd:   number | null
  gemsPriceUsd:  number | null   // USD per 1 gem (smallest pack)
  coinsPriceUsd: number | null   // USD per 1 coin
  coinsPriceSfl: number | null   // SFL per 1 coin
  setCurrentFarm: (farm: Farm | null) => void
  setFarms: (farms: Farm[]) => void
  setStats: (stats: DashboardStats) => void
  setSidebarOpen: (open: boolean) => void
  setExchangeRates: (sfl: number, pol: number, gems: number, coinsUsd?: number, coinsSfl?: number) => void
  addNotification: (type: NotificationItem['type'], message: string) => void
  removeNotification: (id: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const authData = await pb.collection('users').authWithPassword(email, password)
          set({
            user: authData.record as unknown as User,
            token: authData.token,
            isLoading: false,
          })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true })
        try {
          await pb.collection('users').create({ email, password, passwordConfirm: password, name })
          const authData = await pb.collection('users').authWithPassword(email, password)
          set({
            user: authData.record as unknown as User,
            token: authData.token,
            isLoading: false,
          })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      logout: () => {
        pb.authStore.clear()
        set({ user: null, token: null })
      },

      refreshAuth: () => {
        if (pb.authStore.isValid) {
          set({
            user: pb.authStore.model as unknown as User,
            token: pb.authStore.token,
          })
        }
      },
    }),
    {
      name: 'sfl-auth',
      partialize: (s) => ({ token: s.token }),
    }
  )
)

export const useAppStore = create<AppStore>((set, get) => ({
  currentFarm: null,
  farms: [],
  stats: null,
  notifications: [],
  sidebarOpen: true,
  sflPriceUsd:   null,
  polPriceUsd:   null,
  gemsPriceUsd:  null,
  coinsPriceUsd: null,
  coinsPriceSfl: null,

  setCurrentFarm: (farm) => set({ currentFarm: farm }),
  setFarms: (farms) => set({ farms }),
  setStats: (stats) => set({ stats }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setExchangeRates: (sfl, pol, gems, coinsUsd = 0, coinsSfl = 0) =>
    set({ sflPriceUsd: sfl, polPriceUsd: pol, gemsPriceUsd: gems, coinsPriceUsd: coinsUsd || null, coinsPriceSfl: coinsSfl || null }),

  addNotification: (type, message) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ notifications: [...s.notifications, { id, type, message, timestamp: Date.now() }] }))
    setTimeout(() => get().removeNotification(id), 4000)
  },

  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}))
