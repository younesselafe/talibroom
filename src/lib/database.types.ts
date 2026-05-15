// Auto-generated database types for Supabase
// Run `supabase gen types typescript --project-id <id>` to regenerate

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          gender: 'male' | 'female' | 'other' | null
          university: string | null
          city: string | null
          budget: number | null
          lifestyle_vec: Record<string, unknown> | null
          is_premium: boolean
          created_at: string
          last_seen: string | null
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      apartments: {
        Row: {
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
          owner_type: 'student' | 'realtor'
          student_owner_id: string | null
          realtor_id: string | null
          total_slots: number
          available_slots: number
        }
        Insert: Omit<Database['public']['Tables']['apartments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['apartments']['Insert']>
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          image_url: string | null
          type: 'social' | 'marketplace'
          created_at: string
          is_sold: boolean
          category: string
        }
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['posts']['Insert']>
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['comments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['comments']['Insert']>
      }
      post_likes: {
        Row: { post_id: string; user_id: string; created_at: string }
        Insert: { post_id: string; user_id: string }
        Update: never
      }
      links: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
          kind: string
          context_id: string | null
          context_label: string | null
        }
        Insert: Omit<Database['public']['Tables']['links']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['links']['Insert']>
      }
      messages: {
        Row: {
          id: string
          link_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          type: string
          post_id: string | null
          comment_id: string | null
          link_id: string | null
          message_id: string | null
          apartment_id: string | null
          preview: string | null
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          city: string
          owner_id: string
          max_size: number
          status: 'open' | 'closed' | 'matched'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['groups']['Insert']>
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'owner' | 'member'
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['group_members']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['group_members']['Insert']>
      }
      realtors: {
        Row: {
          id: string
          full_name: string
          phone: string
          city: string
          agency_name: string | null
          avatar_url: string | null
          verified: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['realtors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['realtors']['Insert']>
      }
      conversation_reads: {
        Row: { link_id: string; user_id: string; last_read_at: string }
        Insert: { link_id: string; user_id: string; last_read_at: string }
        Update: Partial<Database['public']['Tables']['conversation_reads']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      owner_type: 'student' | 'realtor'
      post_type: 'social' | 'marketplace'
      link_status: 'pending' | 'accepted' | 'declined'
      group_status: 'open' | 'closed' | 'matched'
      group_member_role: 'owner' | 'member'
      group_member_status: 'pending' | 'accepted' | 'declined'
      gender_enum: 'male' | 'female' | 'other'
    }
  }
}
