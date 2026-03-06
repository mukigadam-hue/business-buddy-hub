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
      businesses: {
        Row: {
          address: string
          business_code: string | null
          business_type: string
          contact: string
          created_at: string
          email: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          settings_password: string | null
          total_capital: number
        }
        Insert: {
          address?: string
          business_code?: string | null
          business_type?: string
          contact?: string
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          settings_password?: string | null
          total_capital?: number
        }
        Update: {
          address?: string
          business_code?: string | null
          business_type?: string
          contact?: string
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
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
        ]
      }
      factory_production: {
        Row: {
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
          business_id: string
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          min_stock_level: number
          name: string
          quantity: number
          supplier: string
          unit_cost: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          min_stock_level?: number
          name: string
          quantity?: number
          supplier?: string
          unit_cost?: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          min_stock_level?: number
          name?: string
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
          business_id: string
          code: string
          created_at: string
          customer_name: string
          grand_total: number
          id: string
          sharing_code: string | null
          status: string
          transferred_to_sale: boolean
          type: string
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          customer_name?: string
          grand_total?: number
          id?: string
          sharing_code?: string | null
          status?: string
          transferred_to_sale?: boolean
          type?: string
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          customer_name?: string
          grand_total?: number
          id?: string
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
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
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
          business_id: string
          created_at: string
          grand_total: number
          id: string
          recorded_by: string
          supplier: string
        }
        Insert: {
          business_id: string
          created_at?: string
          grand_total?: number
          id?: string
          recorded_by?: string
          supplier?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          grand_total?: number
          id?: string
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
          business_id: string
          created_at: string
          customer_name: string
          from_order_code: string | null
          from_order_id: string | null
          grand_total: number
          id: string
          recorded_by: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_name?: string
          from_order_code?: string | null
          from_order_id?: string | null
          grand_total?: number
          id?: string
          recorded_by?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_name?: string
          from_order_code?: string | null
          from_order_id?: string | null
          grand_total?: number
          id?: string
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
          business_id: string
          cost: number
          created_at: string
          customer_name: string
          description: string
          id: string
          seller_name: string
          service_name: string
        }
        Insert: {
          business_id: string
          cost?: number
          created_at?: string
          customer_name?: string
          description?: string
          id?: string
          seller_name?: string
          service_name: string
        }
        Update: {
          business_id?: string
          cost?: number
          created_at?: string
          customer_name?: string
          description?: string
          id?: string
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
          business_id: string
          buying_price: number
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url_1: string | null
          image_url_2: string | null
          image_url_3: string | null
          min_stock_level: number
          name: string
          quality: string
          quantity: number
          retail_price: number
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          business_id: string
          buying_price?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url_1?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          min_stock_level?: number
          name: string
          quality?: string
          quantity?: number
          retail_price?: number
          updated_at?: string
          wholesale_price?: number
        }
        Update: {
          business_id?: string
          buying_price?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url_1?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          min_stock_level?: number
          name?: string
          quality?: string
          quantity?: number
          retail_price?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role_in_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: string
      }
      is_business_member: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner_or_admin: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
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
      business_role: ["owner", "admin", "worker"],
    },
  },
} as const
