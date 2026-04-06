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
      app_announcements: {
        Row: {
          announcement_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          title: string
        }
        Insert: {
          announcement_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          title?: string
        }
        Update: {
          announcement_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          title?: string
        }
        Relationships: []
      }
      business_blocks: {
        Row: {
          blocked_business_id: string
          business_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_business_id: string
          business_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_business_id?: string
          business_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_blocks_blocked_business_id_fkey"
            columns: ["blocked_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_blocks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_contacts: {
        Row: {
          business_id: string
          contact_business_id: string
          created_at: string
          id: string
          nickname: string
          notes: string
        }
        Insert: {
          business_id: string
          contact_business_id: string
          created_at?: string
          id?: string
          nickname?: string
          notes?: string
        }
        Update: {
          business_id?: string
          contact_business_id?: string
          created_at?: string
          id?: string
          nickname?: string
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contacts_contact_business_id_fkey"
            columns: ["contact_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_customers: {
        Row: {
          business_id: string
          created_at: string
          customer_name: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_name?: string
          id?: string
          phone?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_name?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          description: string
          expense_date: string
          from_order_id: string | null
          id: string
          recorded_by: string
        }
        Insert: {
          amount?: number
          business_id: string
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          from_order_id?: string | null
          id?: string
          recorded_by?: string
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          from_order_id?: string | null
          id?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_expenses_from_order_id_fkey"
            columns: ["from_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      business_memberships: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["business_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["business_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["business_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_payment_methods: {
        Row: {
          account_name: string
          account_number: string
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          provider_name: string
          provider_type: string
        }
        Insert: {
          account_name?: string
          account_number?: string
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          provider_type?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          provider_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_payment_methods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reviews: {
        Row: {
          business_id: string
          comment: string
          created_at: string
          id: string
          likes_count: number
          rating: number
          reviewer_id: string
        }
        Insert: {
          business_id: string
          comment?: string
          created_at?: string
          id?: string
          likes_count?: number
          rating?: number
          reviewer_id: string
        }
        Update: {
          business_id?: string
          comment?: string
          created_at?: string
          id?: string
          likes_count?: number
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_team_members: {
        Row: {
          age: number | null
          agreed_amount: number
          business_id: string
          created_at: string
          full_name: string
          gender: string
          hire_date: string
          id: string
          is_active: boolean
          next_payment_due: string | null
          occupation: string
          payment_frequency: string
          phone: string
          rank: string
          rental_end_date: string | null
          rental_purpose: string
          salary: number
        }
        Insert: {
          age?: number | null
          agreed_amount?: number
          business_id: string
          created_at?: string
          full_name: string
          gender?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          next_payment_due?: string | null
          occupation?: string
          payment_frequency?: string
          phone?: string
          rank?: string
          rental_end_date?: string | null
          rental_purpose?: string
          salary?: number
        }
        Update: {
          age?: number | null
          agreed_amount?: number
          business_id?: string
          created_at?: string
          full_name?: string
          gender?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          next_payment_due?: string | null
          occupation?: string
          payment_frequency?: string
          phone?: string
          rank?: string
          rental_end_date?: string | null
          rental_purpose?: string
          salary?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_team_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_tips: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      business_worker_advances: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          date_given: string
          id: string
          reason: string | null
          remaining_balance: number
          status: string
          worker_id: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          date_given?: string
          id?: string
          reason?: string | null
          remaining_balance?: number
          status?: string
          worker_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          date_given?: string
          id?: string
          reason?: string | null
          remaining_balance?: number
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_worker_advances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_worker_advances_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "business_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      business_worker_payments: {
        Row: {
          advance_deducted: number
          amount_due: number
          amount_paid: number
          business_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          worker_id: string
        }
        Insert: {
          advance_deducted?: number
          amount_due?: number
          amount_paid?: number
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          worker_id: string
        }
        Update: {
          advance_deducted?: number
          amount_due?: number
          amount_paid?: number
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_worker_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_worker_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "business_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string
          business_code: string | null
          business_type: string
          contact: string
          country_code: string
          created_at: string
          currency_symbol: string
          district: string
          email: string
          id: string
          is_discoverable: boolean
          logo_url: string | null
          name: string
          owner_id: string
          products_description: string
          settings_password: string | null
          total_capital: number
        }
        Insert: {
          address?: string
          business_code?: string | null
          business_type?: string
          contact?: string
          country_code?: string
          created_at?: string
          currency_symbol?: string
          district?: string
          email?: string
          id?: string
          is_discoverable?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          products_description?: string
          settings_password?: string | null
          total_capital?: number
        }
        Update: {
          address?: string
          business_code?: string | null
          business_type?: string
          contact?: string
          country_code?: string
          created_at?: string
          currency_symbol?: string
          district?: string
          email?: string
          id?: string
          is_discoverable?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          products_description?: string
          settings_password?: string | null
          total_capital?: number
        }
        Relationships: []
      }
      factory_expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          description: string
          expense_date: string
          from_order_id: string | null
          id: string
          recorded_by: string
        }
        Insert: {
          amount?: number
          business_id: string
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          from_order_id?: string | null
          id?: string
          recorded_by?: string
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          from_order_id?: string | null
          id?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_expenses_from_order_id_fkey"
            columns: ["from_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_production: {
        Row: {
          batch_number: string
          business_id: string
          created_at: string
          expiry_date: string | null
          id: string
          materials_used: Json
          notes: string
          product_name: string
          product_stock_id: string | null
          production_date: string
          quantity_produced: number
          recorded_by: string
          waste_quantity: number
          waste_unit: string
        }
        Insert: {
          batch_number?: string
          business_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          materials_used?: Json
          notes?: string
          product_name: string
          product_stock_id?: string | null
          production_date: string
          quantity_produced?: number
          recorded_by?: string
          waste_quantity?: number
          waste_unit?: string
        }
        Update: {
          batch_number?: string
          business_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          materials_used?: Json
          notes?: string
          product_name?: string
          product_stock_id?: string | null
          production_date?: string
          quantity_produced?: number
          recorded_by?: string
          waste_quantity?: number
          waste_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_production_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_production_product_stock_id_fkey"
            columns: ["product_stock_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_raw_materials: {
        Row: {
          boxes_per_container: number
          business_id: string
          cartons_per_box: number
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          min_stock_level: number
          name: string
          pieces_per_carton: number
          quantity: number
          supplier: string
          unit_cost: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          boxes_per_container?: number
          business_id: string
          cartons_per_box?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          min_stock_level?: number
          name: string
          pieces_per_carton?: number
          quantity?: number
          supplier?: string
          unit_cost?: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          boxes_per_container?: number
          business_id?: string
          cartons_per_box?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          min_stock_level?: number
          name?: string
          pieces_per_carton?: number
          quantity?: number
          supplier?: string
          unit_cost?: number
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_raw_materials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_team_members: {
        Row: {
          business_id: string
          created_at: string
          full_name: string
          hire_date: string
          id: string
          is_active: boolean
          next_payment_due: string | null
          payment_frequency: string
          phone: string
          rank: string
          salary: number
        }
        Insert: {
          business_id: string
          created_at?: string
          full_name: string
          hire_date?: string
          id?: string
          is_active?: boolean
          next_payment_due?: string | null
          payment_frequency?: string
          phone?: string
          rank?: string
          salary?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          full_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          next_payment_due?: string | null
          payment_frequency?: string
          phone?: string
          rank?: string
          salary?: number
        }
        Relationships: [
          {
            foreignKeyName: "factory_team_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_worker_advances: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          date_given: string
          id: string
          reason: string | null
          remaining_balance: number
          status: string
          worker_id: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          date_given?: string
          id?: string
          reason?: string | null
          remaining_balance?: number
          status?: string
          worker_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          date_given?: string
          id?: string
          reason?: string | null
          remaining_balance?: number
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_worker_advances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_worker_advances_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "factory_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_worker_payments: {
        Row: {
          advance_deducted: number
          amount_due: number
          amount_paid: number
          business_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          worker_id: string
        }
        Insert: {
          advance_deducted?: number
          amount_due?: number
          amount_paid?: number
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          worker_id: string
        }
        Update: {
          advance_deducted?: number
          amount_due?: number
          amount_paid?: number
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_worker_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_worker_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "factory_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          business_id: string
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          type: string
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          is_active?: boolean
          type?: string
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      order_disputes: {
        Row: {
          business_id: string
          created_at: string
          description: string
          dispute_type: string
          id: string
          order_id: string
          photo_urls: Json
          reporter_business_id: string
          resolution: string
          resolved_at: string | null
          status: string
          supplier_response: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string
          dispute_type?: string
          id?: string
          order_id: string
          photo_urls?: Json
          reporter_business_id: string
          resolution?: string
          resolved_at?: string | null
          status?: string
          supplier_response?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          dispute_type?: string
          id?: string
          order_id?: string
          photo_urls?: Json
          reporter_business_id?: string
          resolution?: string
          resolved_at?: string | null
          status?: string
          supplier_response?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_disputes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_disputes_reporter_business_id_fkey"
            columns: ["reporter_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          category: string
          created_at: string
          id: string
          item_name: string
          order_id: string
          price_type: string
          quality: string
          quantity: number
          serial_numbers: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          item_name: string
          order_id: string
          price_type?: string
          quality?: string
          quantity?: number
          serial_numbers?: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          order_id?: string
          price_type?: string
          quality?: string
          quantity?: number
          serial_numbers?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number
          balance: number
          business_id: string
          cancelled_reason: string
          code: string
          created_at: string
          customer_name: string
          deleted_at: string | null
          grand_total: number
          id: string
          payment_method: string
          payment_status: string
          proof_url: string | null
          sharing_code: string | null
          status: string
          transferred_to_sale: boolean
          type: string
        }
        Insert: {
          amount_paid?: number
          balance?: number
          business_id: string
          cancelled_reason?: string
          code: string
          created_at?: string
          customer_name?: string
          deleted_at?: string | null
          grand_total?: number
          id?: string
          payment_method?: string
          payment_status?: string
          proof_url?: string | null
          sharing_code?: string | null
          status?: string
          transferred_to_sale?: boolean
          type?: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          business_id?: string
          cancelled_reason?: string
          code?: string
          created_at?: string
          customer_name?: string
          deleted_at?: string | null
          grand_total?: number
          id?: string
          payment_method?: string
          payment_status?: string
          proof_url?: string | null
          sharing_code?: string | null
          status?: string
          transferred_to_sale?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_premium: boolean
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_premium?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_premium?: boolean
        }
        Relationships: []
      }
      property_assets: {
        Row: {
          area_size: number
          area_unit: string
          asset_code: string | null
          business_id: string
          category: string
          created_at: string
          daily_price: number
          deleted_at: string | null
          description: string
          features: string
          hourly_price: number
          id: string
          image_url_1: string | null
          image_url_2: string | null
          image_url_3: string | null
          is_available: boolean
          location: string
          monthly_price: number
          name: string
          owner_contact: string
          owner_name: string
          room_size: string
          rules: string
          sub_category: string
          total_rooms: number
          updated_at: string
        }
        Insert: {
          area_size?: number
          area_unit?: string
          asset_code?: string | null
          business_id: string
          category?: string
          created_at?: string
          daily_price?: number
          deleted_at?: string | null
          description?: string
          features?: string
          hourly_price?: number
          id?: string
          image_url_1?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          is_available?: boolean
          location?: string
          monthly_price?: number
          name: string
          owner_contact?: string
          owner_name?: string
          room_size?: string
          rules?: string
          sub_category?: string
          total_rooms?: number
          updated_at?: string
        }
        Update: {
          area_size?: number
          area_unit?: string
          asset_code?: string | null
          business_id?: string
          category?: string
          created_at?: string
          daily_price?: number
          deleted_at?: string | null
          description?: string
          features?: string
          hourly_price?: number
          id?: string
          image_url_1?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          is_available?: boolean
          location?: string
          monthly_price?: number
          name?: string
          owner_contact?: string
          owner_name?: string
          room_size?: string
          rules?: string
          sub_category?: string
          total_rooms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      property_bookings: {
        Row: {
          age: number | null
          agreed_amount: number
          amount_paid: number
          asset_id: string
          booking_type: string
          business_id: string
          created_at: string
          duration_type: string
          end_date: string
          expected_payment_date: string | null
          gender: string
          id: string
          last_payment_date: string | null
          notes: string
          owner_notes: string | null
          payment_frequency: string
          payment_method: string
          payment_status: string
          proof_url: string | null
          rental_purpose: string | null
          renter_contact: string
          renter_id: string
          renter_name: string
          renter_occupation: string | null
          start_date: string
          status: string
          total_price: number
        }
        Insert: {
          age?: number | null
          agreed_amount?: number
          amount_paid?: number
          asset_id: string
          booking_type?: string
          business_id: string
          created_at?: string
          duration_type?: string
          end_date: string
          expected_payment_date?: string | null
          gender?: string
          id?: string
          last_payment_date?: string | null
          notes?: string
          owner_notes?: string | null
          payment_frequency?: string
          payment_method?: string
          payment_status?: string
          proof_url?: string | null
          rental_purpose?: string | null
          renter_contact?: string
          renter_id: string
          renter_name?: string
          renter_occupation?: string | null
          start_date: string
          status?: string
          total_price?: number
        }
        Update: {
          age?: number | null
          agreed_amount?: number
          amount_paid?: number
          asset_id?: string
          booking_type?: string
          business_id?: string
          created_at?: string
          duration_type?: string
          end_date?: string
          expected_payment_date?: string | null
          gender?: string
          id?: string
          last_payment_date?: string | null
          notes?: string
          owner_notes?: string | null
          payment_frequency?: string
          payment_method?: string
          payment_status?: string
          proof_url?: string | null
          rental_purpose?: string | null
          renter_contact?: string
          renter_id?: string
          renter_name?: string
          renter_occupation?: string | null
          start_date?: string
          status?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "property_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      property_check_ins: {
        Row: {
          booking_id: string
          business_id: string
          check_type: string
          created_at: string
          id: string
          notes: string
          photo_urls: Json
          recorded_by: string
        }
        Insert: {
          booking_id: string
          business_id: string
          check_type?: string
          created_at?: string
          id?: string
          notes?: string
          photo_urls?: Json
          recorded_by: string
        }
        Update: {
          booking_id?: string
          business_id?: string
          check_type?: string
          created_at?: string
          id?: string
          notes?: string
          photo_urls?: Json
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_check_ins_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "property_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_check_ins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      property_complaints: {
        Row: {
          asset_id: string
          booking_id: string
          business_id: string
          category: string
          created_at: string
          description: string
          id: string
          owner_response: string
          renter_id: string
          renter_name: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          asset_id: string
          booking_id: string
          business_id: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          owner_response?: string
          renter_id: string
          renter_name?: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          asset_id?: string
          booking_id?: string
          business_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          owner_response?: string
          renter_id?: string
          renter_name?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_complaints_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "property_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_complaints_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "property_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_complaints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      property_conversations: {
        Row: {
          asset_id: string | null
          business_id: string
          created_at: string
          id: string
          last_message_at: string
          renter_id: string
        }
        Insert: {
          asset_id?: string | null
          business_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          renter_id: string
        }
        Update: {
          asset_id?: string | null
          business_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          renter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_conversations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "property_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      property_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "property_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          category: string
          created_at: string
          id: string
          item_name: string
          purchase_id: string
          quality: string
          quantity: number
          serial_numbers: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          item_name: string
          purchase_id: string
          quality?: string
          quantity?: number
          serial_numbers?: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          purchase_id?: string
          quality?: string
          quantity?: number
          serial_numbers?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: number
          balance: number
          business_id: string
          created_at: string
          grand_total: number
          id: string
          payment_status: string
          recorded_by: string
          supplier: string
        }
        Insert: {
          amount_paid?: number
          balance?: number
          business_id: string
          created_at?: string
          grand_total?: number
          id?: string
          payment_status?: string
          recorded_by?: string
          supplier?: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          business_id?: string
          created_at?: string
          grand_total?: number
          id?: string
          payment_status?: string
          recorded_by?: string
          supplier?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          business_id: string
          business_info: Json | null
          buyer_name: string
          code: string | null
          created_at: string
          grand_total: number
          id: string
          items: Json
          receipt_type: string
          seller_name: string
          transaction_id: string
        }
        Insert: {
          business_id: string
          business_info?: Json | null
          buyer_name?: string
          code?: string | null
          created_at?: string
          grand_total?: number
          id?: string
          items?: Json
          receipt_type?: string
          seller_name?: string
          transaction_id: string
        }
        Update: {
          business_id?: string
          business_info?: Json | null
          buyer_name?: string
          code?: string | null
          created_at?: string
          grand_total?: number
          id?: string
          items?: Json
          receipt_type?: string
          seller_name?: string
          transaction_id?: string
        }
        Relationships: []
      }
      review_likes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "business_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          category: string
          created_at: string
          id: string
          item_name: string
          price_type: string
          quality: string
          quantity: number
          sale_id: string
          serial_numbers: string
          stock_item_id: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          item_name: string
          price_type?: string
          quality?: string
          quantity?: number
          sale_id: string
          serial_numbers?: string
          stock_item_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          price_type?: string
          quality?: string
          quantity?: number
          sale_id?: string
          serial_numbers?: string
          stock_item_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          balance: number
          business_id: string
          created_at: string
          customer_name: string
          from_order_code: string | null
          from_order_id: string | null
          grand_total: number
          id: string
          payment_status: string
          recorded_by: string
        }
        Insert: {
          amount_paid?: number
          balance?: number
          business_id: string
          created_at?: string
          customer_name?: string
          from_order_code?: string | null
          from_order_id?: string | null
          grand_total?: number
          id?: string
          payment_status?: string
          recorded_by?: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          business_id?: string
          created_at?: string
          customer_name?: string
          from_order_code?: string | null
          from_order_id?: string | null
          grand_total?: number
          id?: string
          payment_status?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_items: {
        Row: {
          category: string
          created_at: string
          id: string
          item_name: string
          quality: string
          quantity: number
          service_id: string
          stock_item_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          item_name: string
          quality?: string
          quantity?: number
          service_id: string
          stock_item_id: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          quality?: string
          quantity?: number
          service_id?: string
          stock_item_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          amount_paid: number
          balance: number
          business_id: string
          cost: number
          created_at: string
          customer_name: string
          description: string
          id: string
          payment_status: string
          seller_name: string
          service_name: string
        }
        Insert: {
          amount_paid?: number
          balance?: number
          business_id: string
          cost?: number
          created_at?: string
          customer_name?: string
          description?: string
          id?: string
          payment_status?: string
          seller_name?: string
          service_name: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          business_id?: string
          cost?: number
          created_at?: string
          customer_name?: string
          description?: string
          id?: string
          payment_status?: string
          seller_name?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_orders: {
        Row: {
          created_at: string
          from_business_id: string
          id: string
          order_id: string
          sharing_code: string
          to_business_id: string
        }
        Insert: {
          created_at?: string
          from_business_id: string
          id?: string
          order_id: string
          sharing_code: string
          to_business_id: string
        }
        Update: {
          created_at?: string
          from_business_id?: string
          id?: string
          order_id?: string
          sharing_code?: string
          to_business_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_orders_from_business_id_fkey"
            columns: ["from_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_orders_to_business_id_fkey"
            columns: ["to_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          barcode: string
          boxes_per_container: number
          business_id: string
          buying_price: number
          cartons_per_box: number
          category: string
          created_at: string
          deleted_at: string | null
          deleted_by: string
          id: string
          image_url_1: string | null
          image_url_2: string | null
          image_url_3: string | null
          min_stock_level: number
          name: string
          pieces_per_carton: number
          quality: string
          quantity: number
          retail_price: number
          tax_rate: number
          unit_type: string
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          barcode?: string
          boxes_per_container?: number
          business_id: string
          buying_price?: number
          cartons_per_box?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string
          id?: string
          image_url_1?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          min_stock_level?: number
          name: string
          pieces_per_carton?: number
          quality?: string
          quantity?: number
          retail_price?: number
          tax_rate?: number
          unit_type?: string
          updated_at?: string
          wholesale_price?: number
        }
        Update: {
          barcode?: string
          boxes_per_container?: number
          business_id?: string
          buying_price?: number
          cartons_per_box?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string
          id?: string
          image_url_1?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          min_stock_level?: number
          name?: string
          pieces_per_carton?: number
          quality?: string
          quantity?: number
          retail_price?: number
          tax_rate?: number
          unit_type?: string
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          business_id: string
          cancelled_at: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          plan: string
          price: number
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          plan?: string
          price?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          plan?: string
          price?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_requests: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string
          id: string
          message: string
          requested_by: string
          requested_from: string | null
          responded_at: string | null
          status: string
          target_role: string
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at?: string
          id?: string
          message?: string
          requested_by: string
          requested_from?: string | null
          responded_at?: string | null
          status?: string
          target_role?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          message?: string
          requested_by?: string
          requested_from?: string | null
          responded_at?: string | null
          status?: string
          target_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_profiles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_premium: boolean
        }[]
      }
      admin_set_premium: {
        Args: { _is_premium: boolean; _user_id: string }
        Returns: undefined
      }
      check_booking_conflict: {
        Args: {
          _asset_id: string
          _end: string
          _exclude_booking_id?: string
          _start: string
        }
        Returns: boolean
      }
      get_business_members: {
        Args: { _business_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          role: Database["public"]["Enums"]["business_role"]
          user_id: string
        }[]
      }
      get_business_public_products: {
        Args: { _business_id: string; _limit?: number }
        Returns: {
          category: string
          id: string
          image_url_1: string
          name: string
          quality: string
          quantity: number
          retail_price: number
        }[]
      }
      get_business_reviews: {
        Args: { _business_id: string; _limit?: number; _offset?: number }
        Returns: {
          comment: string
          created_at: string
          id: string
          likes_count: number
          rating: number
          reviewer_id: string
          reviewer_name: string
        }[]
      }
      get_user_role_in_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_member: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner_or_admin: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_premium: { Args: { _business_id: string }; Returns: boolean }
      lookup_business_by_code: {
        Args: { _code: string }
        Returns: {
          address: string
          business_type: string
          contact: string
          email: string
          id: string
          logo_url: string
          name: string
        }[]
      }
      search_businesses:
        | {
            Args: { _limit?: number; _offset?: number; _query?: string }
            Returns: {
              address: string
              business_code: string
              business_type: string
              contact: string
              email: string
              id: string
              logo_url: string
              name: string
              products_description: string
            }[]
          }
        | {
            Args: {
              _country_code?: string
              _limit?: number
              _offset?: number
              _query?: string
            }
            Returns: {
              address: string
              business_code: string
              business_type: string
              contact: string
              country_code: string
              email: string
              id: string
              logo_url: string
              name: string
              products_description: string
            }[]
          }
      search_property_assets: {
        Args: {
          _category?: string
          _end_date?: string
          _limit?: number
          _location?: string
          _max_price?: number
          _min_price?: number
          _offset?: number
          _query?: string
          _start_date?: string
        }
        Returns: {
          area_size: number
          area_unit: string
          business_contact: string
          business_id: string
          business_name: string
          category: string
          daily_price: number
          description: string
          features: string
          hourly_price: number
          id: string
          image_url_1: string
          location: string
          monthly_price: number
          name: string
          owner_contact: string
          owner_name: string
          room_size: string
          sub_category: string
          total_rooms: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      business_role: "owner" | "admin" | "worker"
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
      business_role: ["owner", "admin", "worker"],
    },
  },
} as const
