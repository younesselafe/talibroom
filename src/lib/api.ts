import { supabase } from './supabase'
import type {
  Profile, Apartment, Post, Comment, Link, Message,
  Notification, Group, GroupMember, Realtor, LinkKind, LinkStatus, GroupMemberStatus,
  Report, ReportTarget, ConciergeRequest, ConciergeOffer, ConciergeOfferItem,
} from '@/types'

/**
 * Data layer — every call hits Supabase. Reads return joined/derived shapes
 * matching the app's types; writes return the created row. Errors throw so
 * react-query / callers can surface them.
 */

// ─── helpers ────────────────────────────────────────────────────────────

/** Throw on a Postgrest error. */
function ok(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** Current user id (read from the local session — no network round-trip). */
async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

type Bucket = 'avatars' | 'post-images' | 'apartment-images' | 'chat-images' | 'videos' | 'concierge-images'

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024 // 100 MB hard limit
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']

/** Validate a video file's type, size, and duration before upload. */
export async function validateVideo(file: File, maxSeconds: number): Promise<void> {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error('Only MP4, WebM, or MOV videos can be uploaded.')
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('Video must be under 100 MB.')
  }
  await new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      if (v.duration > maxSeconds) {
        reject(new Error(`Video must be ${maxSeconds} seconds or shorter.`))
      } else {
        resolve()
      }
    }
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read video metadata.')) }
    v.src = url
  })
}

async function uploadVideo(file: File): Promise<string> {
  const me = await uid()
  if (!me) throw new Error('You need to be signed in')
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
  // Storage RLS requires the first path segment to be the uploader's UID.
  const path = `${me}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('videos')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  ok(error)
  return supabase.storage.from('videos').getPublicUrl(path).data.publicUrl
}

/** Upload a file to a storage bucket and return its public URL. */
/** Max upload size — keeps storage costs down and rejects huge files early. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

async function uploadImage(bucket: Bucket, file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('That image is over 5 MB — please pick a smaller one.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded.')
  }
  const me = await uid()
  if (!me) throw new Error('You need to be signed in')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  // Storage RLS (0020) requires the first path segment to be the uploader's UID.
  const path = `${me}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  ok(error)
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

// Embedded-relation hints (FK constraint names from the live schema).
const POST_SELECT      = '*, author:profiles!posts_user_id_fkey(*), post_likes(count), comments(count)'
const APARTMENT_SELECT = '*, realtor:realtors!apartments_realtor_id_fkey(*), student_owner:profiles!apartments_student_owner_id_fkey(*)'
const LINK_SELECT      = '*, sender:profiles!links_sender_id_fkey(*), receiver:profiles!links_receiver_id_fkey(*)'

const MESSAGE_PAGE = 10 // initial chat history page size

/** Attach like/comment counts and the viewer's like state to a page of posts.
 *  The like lookup is scoped to this page's ids — never the user's full history. */
async function decoratePosts(rows: unknown[]): Promise<Post[]> {
  const posts = rows as Array<Post & {
    post_likes?: { count: number }[]
    comments?: { count: number }[]
  }>
  const me = await uid()
  let liked = new Set<string>()
  if (me && posts.length > 0) {
    const { data: myLikes } = await supabase
      .from('post_likes').select('post_id')
      .eq('user_id', me)
      .in('post_id', posts.map((p) => p.id))
    liked = new Set((myLikes ?? []).map((l) => l.post_id as string))
  }
  return posts.map((p) => ({
    ...p,
    likes_count: p.post_likes?.[0]?.count ?? 0,
    comments_count: p.comments?.[0]?.count ?? 0,
    user_has_liked: liked.has(p.id),
  }))
}

export const api = {
  uploadImage,
  validateVideo,

  // ─── Profiles ─────────────────────────────────────────────────────────
  /** Roommate discovery pool — students only, optionally narrowed server-side. */
  getProfiles: async (filters?: { city?: string | null; gender?: string | null }): Promise<Profile[]> => {
    let q = supabase
      .from('profiles').select('*')
      .eq('is_admin', false)
      .eq('account_type', 'student')
      .order('last_seen', { ascending: false, nullsFirst: false })
      .limit(200)
    if (filters?.city)   q = q.eq('city', filters.city)
    if (filters?.gender) q = q.eq('gender', filters.gender)
    const { data, error } = await q
    ok(error)
    return data ?? []
  },

  getProfile: async (id: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', id).maybeSingle()
    ok(error)
    return data
  },

  // ─── Apartments ───────────────────────────────────────────────────────
  getApartments: async (): Promise<Apartment[]> => {
    const { data, error } = await supabase
      .from('apartments').select(APARTMENT_SELECT)
      .order('created_at', { ascending: false })
    ok(error)
    return data ?? []
  },

  getApartmentsPage: async (
    cursor?: string, ownerType?: string, city?: string,
    priceMin?: number | null, priceMax?: number | null,
  ): Promise<Apartment[]> => {
    let query = supabase
      .from('apartments').select(APARTMENT_SELECT)
      .order('created_at', { ascending: false })
      .limit(20)
    if (cursor)    query = query.lt('created_at', cursor)
    if (ownerType) query = query.eq('owner_type', ownerType)
    if (city)      query = query.eq('city', city)
    if (priceMin != null) query = query.gte('price', priceMin)
    if (priceMax != null) query = query.lte('price', priceMax)
    const { data, error } = await query
    ok(error)
    return data ?? []
  },

  /** The signed-in user's own listings — no full-table download. */
  getMyApartments: async (): Promise<Apartment[]> => {
    const me = await uid()
    if (!me) return []
    const { data, error } = await supabase
      .from('apartments').select(APARTMENT_SELECT)
      .eq('student_owner_id', me)
      .order('created_at', { ascending: false })
    ok(error)
    return data ?? []
  },

  getApartment: async (id: string): Promise<Apartment | null> => {
    const { data, error } = await supabase
      .from('apartments').select(APARTMENT_SELECT).eq('id', id).maybeSingle()
    ok(error)
    return data
  },

  createApartment: async (input: {
    title: string; price: number; rooms: number; city: string
    address?: string; description: string; image_urls: string[]; total_slots: number
    video_url?: string | null; ownerType?: 'student' | 'realtor'
  }): Promise<Apartment> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase.from('apartments').insert({
      title: input.title,
      price: input.price,
      rooms: input.rooms,
      city: input.city,
      address: input.address?.trim() || null,
      description: input.description || null,
      image_urls: input.image_urls,
      owner_type: input.ownerType ?? 'student',
      student_owner_id: me,
      total_slots: input.total_slots,
      available_slots: input.total_slots,
      video_url: input.video_url ?? null,
    }).select().single()
    ok(error)
    return data
  },

  // Privileged columns (is_premium, owner_type) are guarded by a DB trigger;
  // the type keeps honest callers from even trying.
  updateApartment: async (
    id: string,
    patch: Partial<Pick<Apartment,
      'title' | 'price' | 'rooms' | 'city' | 'address' | 'description'
      | 'image_urls' | 'video_url' | 'total_slots' | 'available_slots'
    >>,
  ): Promise<void> => {
    const { error } = await supabase.from('apartments').update(patch).eq('id', id)
    ok(error)
  },

  deleteApartment: async (id: string): Promise<void> => {
    const { error } = await supabase.from('apartments').delete().eq('id', id)
    ok(error)
  },

  // ─── Posts ────────────────────────────────────────────────────────────
  getPostsPage: async (cursor?: string): Promise<Post[]> => {
    let query = supabase
      .from('posts').select(POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(20)
    if (cursor) query = query.lt('created_at', cursor)
    const { data, error } = await query
    ok(error)
    return decoratePosts(data ?? [])
  },

  /** The signed-in user's own posts — no full-table download. */
  getMyPosts: async (): Promise<Post[]> => {
    const me = await uid()
    if (!me) return []
    const { data, error } = await supabase
      .from('posts').select(POST_SELECT)
      .eq('user_id', me)
      .order('created_at', { ascending: false })
    ok(error)
    return decoratePosts(data ?? [])
  },

  createPost: async (input: {
    content: string
    type: 'social' | 'marketplace'
    category?: string
    image_url?: string | null
    image_urls?: string[]
    video_url?: string | null
  }): Promise<Post> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase.from('posts').insert({
      user_id: me,
      content: input.content,
      type: input.type,
      category: input.category ?? 'Other',
      image_url: input.image_url ?? null,
      image_urls: input.image_urls ?? [],
      video_url: input.video_url ?? null,
    }).select().single()
    ok(error)
    return data
  },

  /** Count how many posts of `type` the current user created today. */
  getDailyPostCount: async (type: 'social' | 'marketplace'): Promise<number> => {
    const me = await uid()
    if (!me) return 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', me)
      .eq('type', type)
      .gte('created_at', today.toISOString())
    return count ?? 0
  },

  /** Count how many apartment listings the current user (student) created today. */
  getDailyApartmentCount: async (): Promise<number> => {
    const me = await uid()
    if (!me) return 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('apartments')
      .select('*', { count: 'exact', head: true })
      .eq('student_owner_id', me)
      .gte('created_at', today.toISOString())
    return count ?? 0
  },

  /** Count how many groups the current user created today. */
  getDailyGroupCount: async (): Promise<number> => {
    const me = await uid()
    if (!me) return 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', me)
      .gte('created_at', today.toISOString())
    return count ?? 0
  },

  /** Count how many videos the current user sent in chats/posts today. */
  getDailyVideoCount: async (): Promise<number> => {
    const me = await uid()
    if (!me) return 0
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const [{ count: msgCount }, { count: postCount }] = await Promise.all([
      supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', me)
        .not('video_url', 'is', null)
        .gte('created_at', since.toISOString()),
      supabase.from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', me)
        .not('video_url', 'is', null)
        .gte('created_at', since.toISOString()),
    ])
    return (msgCount ?? 0) + (postCount ?? 0)
  },

  /** Upload a video file (after client-side validation) and return the public URL. */
  uploadVideo: async (file: File): Promise<string> => uploadVideo(file),

  deletePost: async (id: string): Promise<void> => {
    const { error } = await supabase.from('posts').delete().eq('id', id)
    ok(error)
  },

  setPostSold: async (id: string, is_sold: boolean): Promise<void> => {
    const { error } = await supabase.from('posts').update({ is_sold }).eq('id', id)
    ok(error)
  },

  // ─── Likes ────────────────────────────────────────────────────────────
  likePost: async (postId: string): Promise<void> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { error } = await supabase
      .from('post_likes').insert({ post_id: postId, user_id: me })
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message)
  },

  unlikePost: async (postId: string): Promise<void> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { error } = await supabase
      .from('post_likes').delete().eq('post_id', postId).eq('user_id', me)
    ok(error)
  },

  // ─── Comments ─────────────────────────────────────────────────────────
  getComments: async (postId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, author:profiles!comments_user_id_fkey(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    ok(error)
    return data ?? []
  },

  createComment: async (postId: string, content: string): Promise<Comment> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: me, content })
      .select('*, author:profiles!comments_user_id_fkey(*)')
      .single()
    ok(error)
    return data
  },

  // ─── Links ────────────────────────────────────────────────────────────
  getLinks: async (): Promise<Link[]> => {
    const me = await uid()
    if (!me) return []
    const { data, error } = await supabase
      .from('links').select(LINK_SELECT)
      .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
      .order('created_at', { ascending: false })
    ok(error)
    const links = (data ?? []) as Link[]
    if (links.length === 0) return links

    // One RPC computes each thread's last message + unread count in SQL —
    // previously the client downloaded EVERY message of EVERY thread.
    const { data: summaries, error: rpcError } = await supabase.rpc('get_link_summaries')
    ok(rpcError)
    const byLink = new Map<string, {
      last_content: string | null
      last_sender_id: string | null
      last_message_at: string | null
      unread_count: number
    }>(
      ((summaries ?? []) as Array<{
        link_id: string; last_content: string | null; last_sender_id: string | null
        last_message_at: string | null; unread_count: number
      }>).map((s) => [s.link_id, s]),
    )

    return links.map((l) => {
      const s = byLink.get(l.id)
      const last_message: Message | undefined = s?.last_message_at
        ? {
            id: `summary-${l.id}`,
            link_id: l.id,
            sender_id: s.last_sender_id ?? '',
            content: s.last_content ?? '',
            created_at: s.last_message_at,
          }
        : undefined
      return { ...l, last_message, unread_count: Number(s?.unread_count ?? 0) }
    }).sort((a, b) => {
      const at = a.last_message?.created_at ?? a.created_at
      const bt = b.last_message?.created_at ?? b.created_at
      return new Date(bt).getTime() - new Date(at).getTime()
    })
  },

  getLink: async (id: string): Promise<Link | null> => {
    const { data, error } = await supabase
      .from('links').select(LINK_SELECT).eq('id', id).maybeSingle()
    ok(error)
    return data
  },

  createLink: async (input: {
    receiver_id: string
    kind: LinkKind
    context_id?: string | null
    context_label?: string | null
  }): Promise<Link> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase.from('links').insert({
      sender_id: me,
      receiver_id: input.receiver_id,
      kind: input.kind,
      context_id: input.context_id ?? null,
      context_label: input.context_label ?? null,
    }).select().single()
    ok(error)
    return data
  },

  updateLinkStatus: async (id: string, status: LinkStatus): Promise<void> => {
    const { error } = await supabase.from('links').update({ status }).eq('id', id)
    ok(error)
  },

  /**
   * Open (or reuse) a 1-on-1 conversation. Idempotent: if a link already
   * exists between the two users — in either direction — it is reused instead
   * of inserting a duplicate (which would violate the `unique_pair` constraint
   * and crash). New links are created already `accepted`, so messaging works
   * immediately with no "pending" step, and an optional opening message seeds
   * the thread. Group joins keep their separate request flow (`joinGroup`).
   */
  startConversation: async (input: {
    receiver_id: string
    kind: LinkKind
    context_id?: string | null
    context_label?: string | null
    openingMessage?: string
  }): Promise<{ link: Link; created: boolean }> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    if (me === input.receiver_id) throw new Error("You can't connect with yourself")

    const pairFilter =
      `and(sender_id.eq.${me},receiver_id.eq.${input.receiver_id}),` +
      `and(sender_id.eq.${input.receiver_id},receiver_id.eq.${me})`

    // 1. Reuse an existing thread (either direction) — no duplicate insert.
    let link: Link | undefined
    let created = false
    const { data: found } = await supabase
      .from('links').select('*').or(pairFilter).limit(1)
    link = found?.[0] as Link | undefined

    if (link) {
      // Re-open a declined thread so the conversation can continue.
      if (link.status !== 'accepted') {
        await supabase.from('links').update({ status: 'accepted' }).eq('id', link.id)
        link = { ...link, status: 'accepted' }
      }
    } else {
      // 2. Create an immediately-active link — no pending step for 1-on-1.
      const { data, error } = await supabase.from('links').insert({
        sender_id: me,
        receiver_id: input.receiver_id,
        kind: input.kind,
        status: 'accepted',
        context_id: input.context_id ?? null,
        context_label: input.context_label ?? null,
      }).select().single()
      if (error) {
        // Lost a race with a parallel insert — fetch and reuse the winner.
        if (/duplicate|unique/i.test(error.message)) {
          const { data: raced } = await supabase
            .from('links').select('*').or(pairFilter).limit(1)
          link = raced?.[0] as Link | undefined
        }
        if (!link) throw new Error(error.message)
      } else {
        link = data
        created = true
      }
    }
    if (!link) throw new Error('Could not open the conversation')

    // 3. Send the opening message whenever one is provided — so "I'm
    //    interested" / "Contact owner" reliably reaches the recipient even
    //    when the link already existed. The error is surfaced, not dropped.
    if (input.openingMessage) {
      const { error: msgError } = await supabase.from('messages').insert({
        link_id: link.id, sender_id: me, content: input.openingMessage,
      })
      ok(msgError)
    }
    return { link, created }
  },

  // ─── Messages ─────────────────────────────────────────────────────────
  /** Latest page of a link thread (newest 30), or the page before `before`. */
  getMessages: async (linkId: string, before?: string): Promise<Message[]> => {
    let q = supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .eq('link_id', linkId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE)
    if (before) q = q.lt('created_at', before)
    const { data, error } = await q
    ok(error)
    return (data ?? []).reverse() // oldest → newest for display
  },

  sendMessage: async (
    linkId: string,
    content: string,
    imageUrl?: string | null,
    videoUrl?: string | null,
  ): Promise<Message> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase
      .from('messages')
      .insert({
        link_id: linkId, sender_id: me, content,
        image_url: imageUrl ?? null,
        video_url: videoUrl ?? null,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single()
    ok(error)
    return data
  },

  /** Count how many chat images this user has sent today (for the 3/day limit). */
  getDailyChatImageCount: async (): Promise<number> => {
    const me = await uid()
    if (!me) return 0
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', me)
      .not('image_url', 'is', null)
      .gte('created_at', since.toISOString())
    return count ?? 0
  },

  uploadChatImage: async (file: File): Promise<string> => uploadImage('chat-images' as Bucket, file),

  markConversationRead: async (linkId: string): Promise<void> => {
    const me = await uid()
    if (!me) return
    const { error } = await supabase.from('conversation_reads').upsert(
      { link_id: linkId, user_id: me, last_read_at: new Date().toISOString() },
      { onConflict: 'link_id,user_id' },
    )
    ok(error)
  },

  /** The other participant's last-read timestamp — drives "Seen" receipts. */
  getPartnerRead: async (linkId: string): Promise<string | null> => {
    const me = await uid()
    if (!me) return null
    const { data, error } = await supabase
      .from('conversation_reads')
      .select('user_id, last_read_at')
      .eq('link_id', linkId)
    ok(error)
    const partner = (data ?? []).find((r) => r.user_id !== me)
    return (partner?.last_read_at as string | undefined) ?? null
  },

  // ─── Notifications ────────────────────────────────────────────────────
  getNotifications: async (): Promise<Notification[]> => {
    const me = await uid()
    if (!me) return []
    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_fkey(*)')
      .eq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(50)
    ok(error)
    return data ?? []
  },

  createNotification: async (payload: {
    user_id: string
    type: string
    preview: string
    actor_id?: string | null
    link_id?: string | null
    apartment_id?: string | null
    post_id?: string | null
    group_id?: string | null
  }): Promise<void> => {
    const me = await uid()
    const { error } = await supabase.from('notifications').insert({
      user_id: payload.user_id,
      actor_id: payload.actor_id ?? me,
      type: payload.type,
      preview: payload.preview,
      link_id: payload.link_id ?? null,
      apartment_id: payload.apartment_id ?? null,
      post_id: payload.post_id ?? null,
      group_id: payload.group_id ?? null,
      is_read: false,
    })
    ok(error)
  },

  markNotificationRead: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notifications').update({ is_read: true }).eq('id', id)
    ok(error)
  },

  markAllNotificationsRead: async (): Promise<void> => {
    const me = await uid()
    if (!me) return
    const { error } = await supabase
      .from('notifications').update({ is_read: true })
      .eq('user_id', me).eq('is_read', false)
    ok(error)
  },

  // ─── Premium requests ─────────────────────────────────────────────────
  uploadReceipt: async (file: File): Promise<string> => {
    const me = await uid()
    if (!me) throw new Error('Not signed in')
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${me}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    ok(error)
    const { data } = supabase.storage.from('receipts').getPublicUrl(path)
    return data.publicUrl
  },

  createPremiumRequest: async (receiptUrl: string): Promise<void> => {
    const me = await uid()
    if (!me) throw new Error('Not signed in')
    const { error } = await supabase.from('premium_requests').insert({
      user_id: me,
      receipt_url: receiptUrl,
      status: 'pending',
    })
    ok(error)
  },

  getMyPremiumRequest: async (): Promise<{ id: string; status: string; created_at: string } | null> => {
    const me = await uid()
    if (!me) return null
    const { data, error } = await supabase
      .from('premium_requests')
      .select('id, status, created_at')
      .eq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    ok(error)
    return data
  },

  // Admin — premium request management
  getPremiumRequests: async (): Promise<Array<{
    id: string; user_id: string; receipt_url: string | null; status: string; created_at: string
    user: { id: string; full_name: string; avatar_url: string | null } | null
  }>> => {
    const { data, error } = await supabase
      .from('premium_requests')
      .select('*, user:profiles!premium_requests_user_id_fkey(id, full_name, avatar_url)')
      .order('created_at', { ascending: false })
    ok(error)
    return data ?? []
  },

  approvePremiumRequest: async (requestId: string, userId: string): Promise<void> => {
    const { error: e1 } = await supabase
      .from('premium_requests').update({ status: 'approved' }).eq('id', requestId)
    ok(e1)
    // Premium is a 30-day window, not a lifetime flag.
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: e2 } = await supabase
      .from('profiles')
      .update({ is_premium: true, premium_expires_at: expires })
      .eq('id', userId)
    ok(e2)
  },

  rejectPremiumRequest: async (requestId: string): Promise<void> => {
    const { error } = await supabase
      .from('premium_requests').update({ status: 'rejected' }).eq('id', requestId)
    ok(error)
  },

  // ─── Groups ───────────────────────────────────────────────────────────
  getGroups: async (): Promise<Group[]> => {
    const { data, error } = await supabase
      .from('groups')
      .select('*, members:group_members(user_id, status, profile:profiles!group_members_user_id_fkey(*))')
      .order('created_at', { ascending: false })
    ok(error)
    const groups = (data ?? []) as Array<Group & { members?: GroupMember[] }>

    // groups.owner_id references auth.users, not profiles — resolve owners separately.
    const ownerIds = [...new Set(groups.map((g) => g.owner_id))]
    let owners: Record<string, Profile> = {}
    if (ownerIds.length) {
      const { data: ps } = await supabase.from('profiles').select('*').in('id', ownerIds)
      owners = Object.fromEntries((ps ?? []).map((p) => [p.id as string, p as Profile]))
    }

    const me = await uid()
    return groups.map((g) => {
      const rows = g.members ?? []
      const mine = me ? rows.find((m) => m.user_id === me) : undefined
      return {
        ...g,
        owner: owners[g.owner_id],
        // "Full" counts ACCEPTED members only — pending requests don't count.
        member_count: rows.filter((m) => m.status === 'accepted').length,
        is_member: mine?.status === 'accepted',
        is_pending: mine?.status === 'pending',
      }
    })
  },

  createGroup: async (input: {
    name: string; description: string; city: string; max_size: number; gender?: 'male' | 'female' | 'mixed'
  }): Promise<Group> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase.from('groups').insert({
      name: input.name,
      description: input.description || null,
      city: input.city,
      owner_id: me,
      max_size: input.max_size,
      gender: input.gender ?? 'mixed',
    }).select().single()
    ok(error)
    return data
  },

  // A join is a request — the group owner approves it before the member can
  // see and post in the group chat.
  joinGroup: async (groupId: string): Promise<void> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { error } = await supabase.from('group_members')
      .insert({ group_id: groupId, user_id: me, role: 'member', status: 'pending' })
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message)
  },

  updateGroupMember: async (id: string, status: GroupMemberStatus): Promise<void> => {
    const { error } = await supabase.from('group_members').update({ status }).eq('id', id)
    ok(error)
  },

  /** Remove a member (or a pending request) from a group — owner control. */
  removeGroupMember: async (memberId: string): Promise<void> => {
    const { error } = await supabase.from('group_members').delete().eq('id', memberId)
    ok(error)
  },

  /** A single group with its member list — powers the group chat header. */
  getGroup: async (id: string): Promise<Group | null> => {
    const { data, error } = await supabase
      .from('groups')
      .select('*, members:group_members(*, profile:profiles!group_members_user_id_fkey(*))')
      .eq('id', id).maybeSingle()
    ok(error)
    if (!data) return null
    const group = data as Group & { members?: GroupMember[] }
    const { data: owner } = await supabase
      .from('profiles').select('*').eq('id', group.owner_id).maybeSingle()
    const me = await uid()
    const members = group.members ?? []
    return {
      ...group,
      owner: owner ?? undefined,
      members,
      member_count: members.filter((m) => m.status === 'accepted').length,
      is_member: !!me && members.some((m) => m.user_id === me && m.status === 'accepted'),
    }
  },

  // ─── Group messages ───────────────────────────────────────────────────
  /** Latest page of a group thread (newest 30), or the page before `before`. */
  getGroupMessages: async (groupId: string, before?: string): Promise<Message[]> => {
    let q = supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE)
    if (before) q = q.lt('created_at', before)
    const { data, error } = await q
    ok(error)
    return (data ?? []).reverse()
  },

  sendGroupMessage: async (
    groupId: string,
    content: string,
    imageUrl?: string | null,
    videoUrl?: string | null,
  ): Promise<Message> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase
      .from('messages')
      .insert({
        group_id: groupId, sender_id: me, content,
        image_url: imageUrl ?? null,
        video_url: videoUrl ?? null,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single()
    ok(error)
    return data
  },

  // ─── Realtors ─────────────────────────────────────────────────────────
  getRealtors: async (): Promise<Realtor[]> => {
    const { data, error } = await supabase
      .from('realtors').select('*').order('created_at', { ascending: false })
    ok(error)
    return data ?? []
  },

  // ─── Favorites (persistent shortlist) ─────────────────────────────────
  getFavoriteIds: async (targetType: 'profile' | 'apartment'): Promise<Set<string>> => {
    const me = await uid()
    if (!me) return new Set()
    const { data, error } = await supabase
      .from('favorites').select('target_id')
      .eq('user_id', me).eq('target_type', targetType)
    ok(error)
    return new Set((data ?? []).map((f) => f.target_id as string))
  },

  addFavorite: async (targetType: 'profile' | 'apartment', targetId: string): Promise<void> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { error } = await supabase.from('favorites')
      .insert({ user_id: me, target_type: targetType, target_id: targetId })
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message)
  },

  removeFavorite: async (targetType: 'profile' | 'apartment', targetId: string): Promise<void> => {
    const me = await uid()
    if (!me) return
    const { error } = await supabase.from('favorites').delete()
      .eq('user_id', me).eq('target_type', targetType).eq('target_id', targetId)
    ok(error)
  },

  // ─── Blocking ─────────────────────────────────────────────────────────
  getBlockedIds: async (): Promise<Set<string>> => {
    const me = await uid()
    if (!me) return new Set()
    const { data, error } = await supabase
      .from('blocked_users').select('blocked_id').eq('blocker_id', me)
    ok(error)
    return new Set((data ?? []).map((b) => b.blocked_id as string))
  },

  blockUser: async (userId: string): Promise<void> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { error } = await supabase.from('blocked_users')
      .insert({ blocker_id: me, blocked_id: userId })
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message)
  },

  unblockUser: async (userId: string): Promise<void> => {
    const me = await uid()
    if (!me) return
    const { error } = await supabase.from('blocked_users').delete()
      .eq('blocker_id', me).eq('blocked_id', userId)
    ok(error)
  },

  // ─── Presence ─────────────────────────────────────────────────────────
  touchLastSeen: async (): Promise<void> => {
    const me = await uid()
    if (!me) return
    await supabase.from('profiles')
      .update({ last_seen: new Date().toISOString() }).eq('id', me)
  },

  // ─── Moderation — reports & bans ──────────────────────────────────────
  /** Flag a profile, post, listing or comment. 5+ distinct reporters of one
   *  user trigger an automatic 24-hour ban (handled by a DB trigger). */
  createReport: async (input: {
    targetType: ReportTarget
    targetId: string
    reportedUserId: string | null
    reason?: string | null
  }): Promise<void> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { error } = await supabase.from('reports').insert({
      reporter_id: me,
      reported_user_id: input.reportedUserId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason?.trim() || null,
    })
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        throw new Error('You have already reported this.')
      }
      throw new Error(error.message)
    }
  },

  /** Every report, newest first — admin only (enforced by RLS). */
  getReports: async (): Promise<Report[]> => {
    const { data, error } = await supabase
      .from('reports')
      .select(
        '*, reporter:profiles!reports_reporter_id_fkey(*),'
        + ' reported_user:profiles!reports_reported_user_id_fkey(*)',
      )
      .order('created_at', { ascending: false })
    ok(error)
    // `reports` is newer than the generated DB types — cast the joined rows.
    return (data ?? []) as unknown as Report[]
  },

  resolveReport: async (id: string): Promise<void> => {
    const { error } = await supabase.from('reports').update({ resolved: true }).eq('id', id)
    ok(error)
  },

  /** Ban (24h) or lift a ban on a user — admin only (enforced by RLS). */
  setUserBan: async (userId: string, banned: boolean): Promise<void> => {
    const { error } = await supabase.from('profiles').update({
      is_banned: banned,
      banned_until: banned ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    }).eq('id', userId)
    ok(error)
  },

  // ─── Concierge ────────────────────────────────────────────────────────────

  /** All concierge requests for the current user (with their offers). */
  getMyConciergeRequests: async (): Promise<ConciergeRequest[]> => {
    const me = await uid()
    if (!me) return []
    const { data, error } = await supabase
      .from('concierge_requests')
      .select('*, offers:concierge_offers(*, items:concierge_offer_items(*))')
      .eq('user_id', me)
      .order('created_at', { ascending: false })
    ok(error)
    return (data ?? []) as unknown as ConciergeRequest[]
  },

  /** Submit a new concierge request (premium users only — RLS enforced). */
  createConciergeRequest: async (input: {
    city: string
    budget_min?: number | null
    budget_max?: number | null
    rooms?: number | null
    move_in_date?: string | null
    notes?: string | null
  }): Promise<ConciergeRequest> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase
      .from('concierge_requests')
      .insert({ user_id: me, ...input })
      .select()
      .single()
    ok(error)
    return data as unknown as ConciergeRequest
  },

  /** Admin: all requests (newest first). */
  getAllConciergeRequests: async (): Promise<ConciergeRequest[]> => {
    const { data, error } = await supabase
      .from('concierge_requests')
      .select('*, user:profiles!concierge_requests_user_id_fkey(*), offers:concierge_offers(*, items:concierge_offer_items(*))')
      .order('created_at', { ascending: false })
    ok(error)
    return (data ?? []) as unknown as ConciergeRequest[]
  },

  /** Admin: create an offer for a request. */
  createConciergeOffer: async (input: {
    request_id: string
    title: string
    description?: string | null
  }): Promise<ConciergeOffer> => {
    const me = await uid()
    if (!me) throw new Error('You need to be signed in')
    const { data, error } = await supabase
      .from('concierge_offers')
      .insert({ ...input, admin_id: me })
      .select()
      .single()
    ok(error)
    // Mark the request as fulfilled
    await supabase.from('concierge_requests')
      .update({ status: 'fulfilled' })
      .eq('id', input.request_id)
    return data as unknown as ConciergeOffer
  },

  /** Admin: add an item to an offer. */
  createConciergeOfferItem: async (input: Omit<ConciergeOfferItem, 'id' | 'created_at'>): Promise<ConciergeOfferItem> => {
    const { data, error } = await supabase
      .from('concierge_offer_items')
      .insert(input)
      .select()
      .single()
    ok(error)
    return data as unknown as ConciergeOfferItem
  },

  /** Admin: update an existing offer item. */
  updateConciergeOfferItem: async (id: string, updates: Partial<ConciergeOfferItem>): Promise<void> => {
    const { error } = await supabase
      .from('concierge_offer_items')
      .update(updates)
      .eq('id', id)
    ok(error)
  },

  /** Admin: delete an offer item. */
  deleteConciergeOfferItem: async (id: string): Promise<void> => {
    const { error } = await supabase.from('concierge_offer_items').delete().eq('id', id)
    ok(error)
  },

  /** Upload an image to the concierge-images bucket (admin only). */
  uploadConciergeImage: async (file: File): Promise<string> => uploadImage('concierge-images' as Bucket, file),

  // ─── Referrals ────────────────────────────────────────────────────────
  /** Total student signups so far — PII-free, callable while logged out. */
  getSignupCount: async (): Promise<number> => {
    const { data, error } = await supabase.rpc('get_signup_count')
    ok(error)
    return (data as number) ?? 0
  },

  /** How many people signed up using the current user's invite link. */
  getMyReferralCount: async (): Promise<number> => {
    const me = await uid()
    if (!me) return 0
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', me)
    ok(error)
    return count ?? 0
  },
}

export type Api = typeof api
