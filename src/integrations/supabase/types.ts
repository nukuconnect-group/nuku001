export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_visits: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          is_pwa: boolean | null
          os: string | null
          page_path: string
          referrer: string | null
          region: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          is_pwa?: boolean | null
          os?: string | null
          page_path: string
          referrer?: string | null
          region?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          is_pwa?: boolean | null
          os?: string | null
          page_path?: string
          referrer?: string | null
          region?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          subcategories: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          subcategories?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          subcategories?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          formation_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          formation_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          formation_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          product_id: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          product_id?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          product_id?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          distance_km: number | null
          driver_current_lat: number | null
          driver_current_lng: number | null
          driver_fee: number
          driver_id: string | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_minutes: number | null
          id: string
          order_id: string
          picked_up_at: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          platform_fee: number
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          distance_km?: number | null
          driver_current_lat?: number | null
          driver_current_lng?: number | null
          driver_fee?: number
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_minutes?: number | null
          id?: string
          order_id: string
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee?: number
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          distance_km?: number | null
          driver_current_lat?: number | null
          driver_current_lng?: number | null
          driver_fee?: number
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_minutes?: number | null
          id?: string
          order_id?: string
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_addresses: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          is_default: boolean | null
          label: string
          lat: number | null
          lng: number | null
          phone: string | null
          quarter: string | null
          street: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          quarter?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          quarter?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_messages: {
        Row: {
          content: string
          created_at: string
          delivery_id: string
          id: string
          is_read: boolean | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          content: string
          created_at?: string
          delivery_id: string
          id?: string
          is_read?: boolean | null
          sender_id: string
          sender_role?: string
        }
        Update: {
          content?: string
          created_at?: string
          delivery_id?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      demands: {
        Row: {
          budget: number | null
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          profile_id: string
          quantity: number | null
          status: string
          title: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          profile_id: string
          quantity?: number | null
          status?: string
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          profile_id?: string
          quantity?: number | null
          status?: string
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_kyc_submissions: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_number: string | null
          id_type: string
          license_plate: string | null
          reviewed_at: string | null
          selfie_url: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          vehicle_brand: string | null
          vehicle_color: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          id_type?: string
          license_plate?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          vehicle_brand?: string | null
          vehicle_color?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          id_type?: string
          license_plate?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          vehicle_brand?: string | null
          vehicle_color?: string | null
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          is_approved: boolean
          is_available: boolean
          license_plate: string | null
          profile_id: string
          rating: number | null
          total_deliveries: number | null
          total_earnings: number | null
          updated_at: string
          user_id: string
          vehicle_type: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_approved?: boolean
          is_available?: boolean
          license_plate?: string | null
          profile_id: string
          rating?: number | null
          total_deliveries?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
          vehicle_type?: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_approved?: boolean
          is_available?: boolean
          license_plate?: string | null
          profile_id?: string
          rating?: number | null
          total_deliveries?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string
          zone?: string | null
        }
        Relationships: []
      }
      driver_ratings: {
        Row: {
          comment: string | null
          created_at: string
          delivery_id: string
          driver_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_id: string
          driver_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_id?: string
          driver_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_ratings_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      formation_modules: {
        Row: {
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          formation_id: string
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          formation_id: string
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          formation_id?: string
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_modules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          formation_id: string
          id: string
          module_id: string | null
          progress_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          formation_id: string
          id?: string
          module_id?: string | null
          progress_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          formation_id?: string
          id?: string
          module_id?: string | null
          progress_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_progress_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "formation_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          instructor: string
          is_paid: boolean | null
          is_published: boolean | null
          level: string
          modules_count: number | null
          price: number | null
          rating: number | null
          slug: string | null
          students_count: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          instructor: string
          is_paid?: boolean | null
          is_published?: boolean | null
          level?: string
          modules_count?: number | null
          price?: number | null
          rating?: number | null
          slug?: string | null
          students_count?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          instructor?: string
          is_paid?: boolean | null
          is_published?: boolean | null
          level?: string
          modules_count?: number | null
          price?: number | null
          rating?: number | null
          slug?: string | null
          students_count?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          attempt_number: number
          category_check: string | null
          confidence: number | null
          content_safety: string | null
          created_at: string
          decision: string
          id: string
          product_id: string | null
          prompt_summary: string | null
          raw_response: Json | null
          reason: string | null
        }
        Insert: {
          attempt_number?: number
          category_check?: string | null
          confidence?: number | null
          content_safety?: string | null
          created_at?: string
          decision: string
          id?: string
          product_id?: string | null
          prompt_summary?: string | null
          raw_response?: Json | null
          reason?: string | null
        }
        Update: {
          attempt_number?: number
          category_check?: string | null
          confidence?: number | null
          content_safety?: string | null
          created_at?: string
          decision?: string
          id?: string
          product_id?: string | null
          prompt_summary?: string | null
          raw_response?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          product_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          product_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          product_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          seller_id: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          seller_id: string
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          seller_id?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_boosts: {
        Row: {
          created_at: string
          days: number
          expires_at: string
          id: string
          is_active: boolean
          plan_name: string
          price: number
          product_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: number
          expires_at: string
          id?: string
          is_active?: boolean
          plan_name?: string
          price?: number
          product_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          plan_name?: string
          price?: number
          product_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_boosts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_traceability: {
        Row: {
          batch_number: string | null
          certifications: string[] | null
          created_at: string
          current_stage: number | null
          harvest_date: string | null
          humidity: string | null
          id: string
          is_organic: boolean | null
          origin: string | null
          producer_id: string
          product_id: string
          status: string | null
          temperature: string | null
          updated_at: string
          weight: string | null
        }
        Insert: {
          batch_number?: string | null
          certifications?: string[] | null
          created_at?: string
          current_stage?: number | null
          harvest_date?: string | null
          humidity?: string | null
          id?: string
          is_organic?: boolean | null
          origin?: string | null
          producer_id: string
          product_id: string
          status?: string | null
          temperature?: string | null
          updated_at?: string
          weight?: string | null
        }
        Update: {
          batch_number?: string | null
          certifications?: string[] | null
          created_at?: string
          current_stage?: number | null
          harvest_date?: string | null
          humidity?: string | null
          id?: string
          is_organic?: boolean | null
          origin?: string | null
          producer_id?: string
          product_id?: string
          status?: string | null
          temperature?: string | null
          updated_at?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_traceability_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_traceability_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_negotiable: boolean
          is_organic: boolean
          location: string | null
          min_order: number | null
          moderated_at: string | null
          moderation_reason: string | null
          moderation_scheduled_at: string | null
          moderation_status: string
          name: string
          price: number
          producer_id: string
          quantity_available: number
          slug: string | null
          stock_status: string
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_negotiable?: boolean
          is_organic?: boolean
          location?: string | null
          min_order?: number | null
          moderated_at?: string | null
          moderation_reason?: string | null
          moderation_scheduled_at?: string | null
          moderation_status?: string
          name: string
          price: number
          producer_id: string
          quantity_available?: number
          slug?: string | null
          stock_status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_negotiable?: boolean
          is_organic?: boolean
          location?: string | null
          min_order?: number | null
          moderated_at?: string | null
          moderation_reason?: string | null
          moderation_scheduled_at?: string | null
          moderation_status?: string
          name?: string
          price?: number
          producer_id?: string
          quantity_available?: number
          slug?: string | null
          stock_status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          created_at: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          cover_images: string[] | null
          cover_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_verified: boolean
          location: string | null
          response_rate: number | null
          updated_at: string
          user_id: string
          user_type: string
          years_active: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          cover_images?: string[] | null
          cover_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          location?: string | null
          response_rate?: number | null
          updated_at?: string
          user_id: string
          user_type?: string
          years_active?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          cover_images?: string[] | null
          cover_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          location?: string | null
          response_rate?: number | null
          updated_at?: string
          user_id?: string
          user_type?: string
          years_active?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          commission_rate: number
          created_at: string
          description: string | null
          id: string
          referral_id: string
          referrer_id: string
          source_amount: number
          source_type: string
        }
        Insert: {
          amount?: number
          commission_rate: number
          created_at?: string
          description?: string | null
          id?: string
          referral_id: string
          referrer_id: string
          source_amount?: number
          source_type?: string
        }
        Update: {
          amount?: number
          commission_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          referral_id?: string
          referrer_id?: string
          source_amount?: number
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_period: string
          commission_rate: number | null
          created_at: string
          expires_at: string | null
          free_renewals_used: number
          id: string
          max_products: number
          plan: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string
          commission_rate?: number | null
          created_at?: string
          expires_at?: string | null
          free_renewals_used?: number
          id?: string
          max_products?: number
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string
          commission_rate?: number | null
          created_at?: string
          expires_at?: string | null
          free_renewals_used?: number
          id?: string
          max_products?: number
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_kyc_submissions: {
        Row: {
          admin_note: string | null
          business_name: string | null
          business_type: string | null
          created_at: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_number: string | null
          id_type: string
          reviewed_at: string | null
          selfie_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          id_type?: string
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          id_type?: string
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_role: string
          subject: string | null
          ticket_id: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_role?: string
          subject?: string | null
          ticket_id?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_role?: string
          subject?: string | null
          ticket_id?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      token_packs: {
        Row: {
          bonus_tokens: number
          code: string
          commission_rate: number | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price_fcfa: number
          sort_order: number
          tier: string | null
          tokens: number
          updated_at: string
        }
        Insert: {
          bonus_tokens?: number
          code: string
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price_fcfa: number
          sort_order?: number
          tier?: string | null
          tokens: number
          updated_at?: string
        }
        Update: {
          bonus_tokens?: number
          code?: string
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price_fcfa?: number
          sort_order?: number
          tier?: string | null
          tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          pack_code: string
          pack_id: string | null
          payment_identifier: string | null
          payment_reference: string | null
          payment_status: string
          price_fcfa: number
          tokens_purchased: number
          tokens_remaining: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          pack_code: string
          pack_id?: string | null
          payment_identifier?: string | null
          payment_reference?: string | null
          payment_status?: string
          price_fcfa: number
          tokens_purchased: number
          tokens_remaining: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          pack_code?: string
          pack_id?: string | null
          payment_identifier?: string | null
          payment_reference?: string | null
          payment_status?: string
          price_fcfa?: number
          tokens_purchased?: number
          tokens_remaining?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "token_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      token_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          purchase_id: string | null
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          purchase_id?: string | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          purchase_id?: string | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "token_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      traceability_events: {
        Row: {
          created_at: string
          event_date: string
          event_description: string
          id: string
          location: string | null
          stage_index: number
          stage_label: string
          traceability_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string
          event_description: string
          id?: string
          location?: string | null
          stage_index?: number
          stage_label: string
          traceability_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_description?: string
          id?: string
          location?: string | null
          stage_index?: number
          stage_label?: string
          traceability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traceability_events_traceability_id_fkey"
            columns: ["traceability_id"]
            isOneToOne: false
            referencedRelation: "product_traceability"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          operator: string
          phone_number: string
          processed_at: string | null
          profile_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          operator?: string
          phone_number: string
          processed_at?: string | null
          profile_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          operator?: string
          phone_number?: string
          processed_at?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      driver_profiles_public: {
        Row: {
          id: string | null
          is_available: boolean | null
          profile_id: string | null
          rating: number | null
          total_deliveries: number | null
          user_id: string | null
          vehicle_type: string | null
          zone: string | null
        }
        Insert: {
          id?: string | null
          is_available?: boolean | null
          profile_id?: string | null
          rating?: number | null
          total_deliveries?: number | null
          user_id?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Update: {
          id?: string | null
          is_available?: boolean | null
          profile_id?: string | null
          rating?: number | null
          total_deliveries?: number | null
          user_id?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user_data: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      claim_referral: { Args: { p_referral_code: string }; Returns: string }
      clear_conversation_messages: {
        Args: { p_conversation_id: string }
        Returns: Json
      }
      complete_token_purchase: {
        Args: { p_payment_reference?: string; p_purchase_id: string }
        Returns: Json
      }
      count_user_products: { Args: { p_user_id: string }; Returns: number }
      create_token_purchase: {
        Args: { p_pack_code: string; p_payment_identifier: string }
        Returns: string
      }
      delete_conversation_thread: {
        Args: { p_conversation_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enroll_paid_formation: {
        Args: { p_formation_id: string; p_user_id: string }
        Returns: string
      }
      expire_old_tokens: { Args: never; Returns: number }
      get_admin_analytics: { Args: never; Returns: Json }
      get_admin_orders: { Args: never; Returns: Json[] }
      get_admin_stats: { Args: never; Returns: Json }
      get_admin_subscriptions: { Args: never; Returns: Json[] }
      get_admin_users: { Args: never; Returns: Json[] }
      get_boosted_product_ids: {
        Args: never
        Returns: {
          product_id: string
        }[]
      }
      get_driver_for_delivery: {
        Args: { p_delivery_id: string }
        Returns: Json
      }
      get_free_plan_status: { Args: { p_user_id: string }; Returns: Json }
      get_products_due_for_moderation: {
        Args: { p_limit?: number }
        Returns: {
          category: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_negotiable: boolean
          is_organic: boolean
          location: string | null
          min_order: number | null
          moderated_at: string | null
          moderation_reason: string | null
          moderation_scheduled_at: string | null
          moderation_status: string
          name: string
          price: number
          producer_id: string
          quantity_available: number
          slug: string | null
          stock_status: string
          unit: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_public_profile_data: { Args: { p_profile_id: string }; Returns: Json }
      get_user_subscription: {
        Args: { p_user_id: string }
        Returns: {
          max_products: number
          plan: string
          status: string
        }[]
      }
      get_user_token_balance: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      renew_free_subscription: { Args: never; Returns: Json }
      resubmit_product_moderation: {
        Args: { p_product_id: string }
        Returns: Json
      }
      spend_user_tokens: {
        Args: {
          p_amount: number
          p_reason: string
          p_reference_id?: string
          p_reference_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_user_subscription: {
        Args: {
          p_billing_period: string
          p_expires_at?: string
          p_max_products: number
          p_plan: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
