// ─── Enum mirrors ──────────────────────────────────────────────────────────────

export type OwnerType = 'student' | 'realtor'
export type PostType = 'social' | 'marketplace'
export type LinkStatus = 'pending' | 'accepted' | 'declined'
export type LinkKind = 'roommate' | 'marketplace' | 'apartment_inquiry' | 'direct'
export type GroupStatus = 'open' | 'closed' | 'matched'
export type GroupMemberRole = 'owner' | 'member'
export type GroupMemberStatus = 'pending' | 'accepted' | 'declined'
export type GenderEnum = 'male' | 'female' | 'other'

// ─── Database row types ────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  gender: GenderEnum | null
  university: string | null
  city: string | null
  budget: number | null
  lifestyle_vec: LifestyleVec | null
  is_premium: boolean
  created_at: string
  last_seen: string | null
}

export interface LifestyleVec {
  sleep_time?: 'early' | 'night_owl'
  study_style?: 'quiet' | 'social'
  cleanliness?: 'tidy' | 'relaxed'
  smoking?: boolean
  pets?: boolean
  guests?: 'often' | 'rarely' | 'never'
  diet?: 'halal' | 'vegetarian' | 'any'
  noise_level?: 'quiet' | 'moderate' | 'lively'
}

export interface Apartment {
  id: string
  title: string
  price: number
  rooms: number
  city: string
  description: string | null
  image_url: string | null
  video_url: string | null
  is_premium: boolean
  created_at: string
  owner_type: OwnerType
  student_owner_id: string | null
  realtor_id: string | null
  total_slots: number
  available_slots: number
  // joined relations (optional)
  realtor?: Realtor
  student_owner?: Profile
}

export interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  type: PostType
  created_at: string
  is_sold: boolean
  category: string
  // joined
  author?: Profile
  likes_count?: number
  comments_count?: number
  user_has_liked?: boolean
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  // joined
  author?: Profile
}

export interface PostLike {
  post_id: string
  user_id: string
  created_at: string
}

export interface Link {
  id: string
  sender_id: string
  receiver_id: string
  status: LinkStatus
  created_at: string
  kind: LinkKind
  context_id: string | null
  context_label: string | null
  // joined
  sender?: Profile
  receiver?: Profile
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  link_id: string
  sender_id: string
  content: string
  created_at: string
  // joined
  sender?: Profile
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  post_id: string | null
  comment_id: string | null
  link_id: string | null
  message_id: string | null
  apartment_id: string | null
  preview: string | null
  is_read: boolean
  created_at: string
  // joined
  actor?: Profile
}

export type NotificationType =
  | 'link_request'
  | 'link_accepted'
  | 'new_message'
  | 'post_like'
  | 'post_comment'
  | 'apartment_inquiry'
  | 'group_invite'
  | 'group_joined'
  | 'system'

export interface Group {
  id: string
  name: string
  description: string | null
  city: string
  owner_id: string
  max_size: number
  status: GroupStatus
  created_at: string
  // joined
  owner?: Profile
  members?: GroupMember[]
  member_count?: number
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: GroupMemberRole
  status: GroupMemberStatus
  created_at: string
  // joined
  profile?: Profile
}

export interface Realtor {
  id: string
  full_name: string
  phone: string
  city: string
  agency_name: string | null
  avatar_url: string | null
  verified: boolean
  created_at: string
  // derived
  listing_count?: number
}

export interface ConversationRead {
  link_id: string
  user_id: string
  last_read_at: string
}

// ─── UI / app-level types ──────────────────────────────────────────────────────

export interface FilterState {
  city: string | null
  university: string | null
  budgetMin: number | null
  budgetMax: number | null
  gender: GenderEnum | null
  lifestyle: Partial<LifestyleVec>
}

export interface ApartmentFilter {
  city: string | null
  ownerType: OwnerType | 'all'
  priceMin: number | null
  priceMax: number | null
  rooms: number | null
  isPremium: boolean | null
}

export type InboxTab = 'requests' | 'chats' | 'inquiries'
export type CommunityTab = 'feed' | 'marketplace'

export const MOROCCAN_CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Meknès',
  'Tanger', 'Agadir', 'Oujda', 'Tétouan', 'El Jadida',
  'Safi', 'Kénitra', 'Mohammedia', 'Béni Mellal', 'Nador',
] as const

export type MoroccanCity = typeof MOROCCAN_CITIES[number]

export const MOROCCAN_UNIVERSITIES = [
  'Université Hassan II de Casablanca',
  'Université Mohammed V de Rabat',
  'Université Cadi Ayyad (Marrakech)',
  'Université Sidi Mohammed Ben Abdellah (Fès)',
  'Université Moulay Ismaïl (Meknès)',
  'Université Abdelmalek Essaâdi (Tanger)',
  'Université Ibn Zohr (Agadir)',
  'Université Mohammed Ier (Oujda)',
  'ISCAE Casablanca',
  'École Nationale de Commerce et de Gestion',
  'ENSAM Casablanca',
  'ENSA (multiple)',
  'Institut National des Postes et Télécommunications',
] as const

export const MARKETPLACE_CATEGORIES = [
  'Books & Courses',
  'Electronics',
  'Furniture',
  'Clothing',
  'Transport',
  'Services',
  'Food & Groceries',
  'Other',
] as const
