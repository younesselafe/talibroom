// ─── Enum mirrors ──────────────────────────────────────────────────────────────

export type AccountType = 'student' | 'realtor' | 'admin'
export type OwnerType = 'student' | 'realtor'
export type PostType = 'social' | 'marketplace'
export type LinkStatus = 'pending' | 'accepted' | 'declined'
export type LinkKind = 'roommate' | 'marketplace' | 'apartment_inquiry' | 'direct'
export type GroupStatus = 'open' | 'closed' | 'matched'
export type GroupMemberRole = 'owner' | 'member'
export type GroupMemberStatus = 'pending' | 'accepted' | 'declined'
export type GenderEnum = 'male' | 'female'

// ─── Database row types ────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  gender: GenderEnum | null
  age?: number | null
  university: string | null
  city: string | null
  budget: number | null
  lifestyle_json: LifestyleVec | null
  is_premium: boolean
  premium_expires_at?: string | null
  created_at: string
  last_seen: string | null
  is_banned?: boolean
  banned_until?: string | null
  is_admin?: boolean
  account_type?: AccountType
}

export type ReportTarget = 'profile' | 'post' | 'apartment' | 'comment'

export interface Report {
  id: string
  reporter_id: string
  reported_user_id: string | null
  target_type: ReportTarget
  target_id: string
  reason: string | null
  resolved: boolean
  created_at: string
  // joined relations (optional)
  reporter?: Profile
  reported_user?: Profile
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
  address?: string | null
  description: string | null
  image_urls: string[]
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
  image_urls: string[]
  video_url?: string | null
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
  link_id: string | null   // set for 1-on-1 link threads
  group_id?: string | null // set for group threads
  sender_id: string
  content: string
  image_url?: string | null
  video_url?: string | null
  created_at: string
  // joined
  sender?: Profile
}

// ─── Concierge ────────────────────────────────────────────────────────────────

export interface ConciergeRequest {
  id: string
  user_id: string
  city: string
  budget_min: number | null
  budget_max: number | null
  rooms: number | null
  move_in_date: string | null
  notes: string | null
  status: 'pending' | 'fulfilled' | 'cancelled'
  created_at: string
  // joined
  user?: Profile
  offers?: ConciergeOffer[]
}

export interface ConciergeOffer {
  id: string
  request_id: string
  admin_id: string
  title: string
  description: string | null
  created_at: string
  // joined
  items?: ConciergeOfferItem[]
}

export interface ConciergeOfferItem {
  id: string
  offer_id: string
  title: string | null
  city: string | null
  address: string | null
  price: number | null
  rooms: number | null
  realtor_name: string | null
  realtor_phone: string | null
  image_urls: string[]
  video_url: string | null
  notes: string | null
  sort_order?: number
  created_at: string
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
  group_id?: string | null
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
  | 'concierge_fulfilled'
  | 'system'

export interface Group {
  id: string
  name: string
  description: string | null
  city: string
  owner_id: string
  max_size: number
  status: GroupStatus
  gender: 'male' | 'female' | 'mixed'
  created_at: string
  // joined / derived
  owner?: Profile
  members?: GroupMember[]
  member_count?: number
  is_member?: boolean   // is the signed-in user an accepted member?
  is_pending?: boolean  // has the signed-in user a pending join request?
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

export type InboxTab = 'chats' | 'groups' | 'inquiries'

export type FavoriteTarget = 'profile' | 'apartment'
export type CommunityTab = 'feed' | 'marketplace'

export const MOROCCAN_CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Meknès',
  'Tanger', 'Agadir', 'Oujda', 'Tétouan', 'El Jadida',
  'Safi', 'Kénitra', 'Mohammedia', 'Béni Mellal', 'Nador',
] as const

export type MoroccanCity = typeof MOROCCAN_CITIES[number]

export const MOROCCAN_UNIVERSITIES = [
  // Public universities
  'Université Hassan II de Casablanca',
  'Université Mohammed V de Rabat',
  'Université Cadi Ayyad (Marrakech)',
  'Université Sidi Mohammed Ben Abdellah (Fès)',
  'Université Moulay Ismaïl (Meknès)',
  'Université Abdelmalek Essaâdi (Tanger-Tétouan)',
  'Université Ibn Zohr (Agadir)',
  'Université Mohammed Premier (Oujda)',
  'Université Chouaib Doukkali (El Jadida)',
  'Université Ibn Tofail (Kénitra)',
  'Université Sultan Moulay Slimane (Béni Mellal)',
  'Université Hassan Ier (Settat)',
  // Grandes écoles
  'Université Mohammed VI Polytechnique (UM6P)',
  'École Mohammadia d\'Ingénieurs (EMI)',
  'ENSIAS Rabat',
  'INSEA Rabat',
  'ENIM Rabat',
  'ISCAE Casablanca',
  'ENCG (multiple campuses)',
  'ENSAM (multiple campuses)',
  'ENSA (multiple campuses)',
  'FST (multiple campuses)',
  'Institut National des Postes et Télécommunications (INPT)',
  'Faculté de Médecine et de Pharmacie (multiple campuses)',
  // Private universities
  'Al Akhawayn University (Ifrane)',
  'Université Internationale de Rabat (UIR)',
  'Université Euromed de Fès (UEMF)',
  'HEM Business School',
] as const

// Must stay in sync with the posts.category CHECK constraint in the database.
export const MARKETPLACE_CATEGORIES = [
  'Books & Textbooks',
  'Furniture',
  'Electronics',
  'Kitchen & Dining',
  'Clothing & Accessories',
  'Sports & Outdoors',
  'Other',
] as const
