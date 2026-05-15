import { sleep } from './utils'
import {
  MOCK_PROFILES, MOCK_APARTMENTS, MOCK_POSTS, MOCK_COMMENTS,
  MOCK_LINKS, MOCK_MESSAGES, MOCK_NOTIFICATIONS, MOCK_GROUPS, MOCK_REALTORS,
} from '@/mock/data'

/**
 * Data layer. In mock mode every call resolves with seed data after a small
 * delay (so loading skeletons get a chance to shine). Swap each body with a
 * `supabase.from(...)` query once the real DB is connected — signatures stay.
 */
export const api = {
  getProfiles:      async () => { await sleep(450); return MOCK_PROFILES },
  getProfile:       async (id: string) => { await sleep(250); return MOCK_PROFILES.find((p) => p.id === id) ?? null },

  getApartments:    async () => { await sleep(450); return MOCK_APARTMENTS },
  getApartment:     async (id: string) => { await sleep(250); return MOCK_APARTMENTS.find((a) => a.id === id) ?? null },

  getPosts:         async () => { await sleep(450); return MOCK_POSTS },
  getComments:      async (postId: string) => { await sleep(250); return MOCK_COMMENTS.filter((c) => c.post_id === postId) },

  getLinks:         async () => { await sleep(400); return MOCK_LINKS },
  getLink:          async (id: string) => { await sleep(200); return MOCK_LINKS.find((l) => l.id === id) ?? null },
  getMessages:      async (linkId: string) => { await sleep(300); return MOCK_MESSAGES.filter((m) => m.link_id === linkId) },

  getNotifications: async () => { await sleep(400); return MOCK_NOTIFICATIONS },
  getGroups:        async () => { await sleep(400); return MOCK_GROUPS },
  getRealtors:      async () => { await sleep(400); return MOCK_REALTORS },
}

export type Api = typeof api
