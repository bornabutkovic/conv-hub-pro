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
      attendees: {
        Row: {
          badge_printed: boolean | null
          checked_in: boolean | null
          created_at: string | null
          email: string | null
          erp_sku: string | null
          event_id: string | null
          first_name: string
          id: string
          institution: string | null
          invoice_sent_at: string | null
          last_name: string
          name: string | null
          oib: string | null
          payment_status: string | null
          phone: string | null
          price_paid: number | null
          profile_id: string | null
          requires_invoice: boolean | null
          scanned_at: string | null
          status: Database["public"]["Enums"]["registration_status"] | null
          ticket_sent_at: string | null
          ticket_tier_id: string | null
          whatsapp_id: string | null
        }
        Insert: {
          badge_printed?: boolean | null
          checked_in?: boolean | null
          created_at?: string | null
          email?: string | null
          erp_sku?: string | null
          event_id?: string | null
          first_name: string
          id?: string
          institution?: string | null
          invoice_sent_at?: string | null
          last_name: string
          name?: string | null
          oib?: string | null
          payment_status?: string | null
          phone?: string | null
          price_paid?: number | null
          profile_id?: string | null
          requires_invoice?: boolean | null
          scanned_at?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          ticket_sent_at?: string | null
          ticket_tier_id?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          badge_printed?: boolean | null
          checked_in?: boolean | null
          created_at?: string | null
          email?: string | null
          erp_sku?: string | null
          event_id?: string | null
          first_name?: string
          id?: string
          institution?: string | null
          invoice_sent_at?: string | null
          last_name?: string
          name?: string | null
          oib?: string | null
          payment_status?: string | null
          phone?: string | null
          price_paid?: number | null
          profile_id?: string | null
          requires_invoice?: boolean | null
          scanned_at?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          ticket_sent_at?: string | null
          ticket_tier_id?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendees_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: Json
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: Json
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      event_memberships: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          role: string | null
          ticket_tier_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          role?: string | null
          ticket_tier_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          role?: string | null
          ticket_tier_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_memberships_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_memberships_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_memberships_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_services: {
        Row: {
          capacity: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          erp_code: string | null
          event_code: string | null
          event_id: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          erp_code?: string | null
          event_code?: string | null
          event_id?: string | null
          id?: string
          name: string
          price?: number
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          erp_code?: string | null
          event_code?: string | null
          event_id?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_services_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_services_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          additional_admins: string[] | null
          bc_position: string | null
          bc_reference: string | null
          created_at: string | null
          currency: string | null
          early_bird_deadline: string | null
          end_date: string | null
          event_id: string | null
          id: string
          institution_id: string | null
          institution_uuid: string | null
          location_city: string | null
          location_country: string | null
          name: string
          notification_sender_email: string | null
          notification_sender_name: string | null
          payment_due_days: number | null
          price: number | null
          short_name: string | null
          slug: string
          start_date: string | null
          status: string | null
          stripe_tax_rate_id: string | null
          support_phone: string | null
          supported_languages: string[] | null
          tax_location: string | null
          vat_rate: number | null
          venue_name: string | null
          website_url: string | null
        }
        Insert: {
          additional_admins?: string[] | null
          bc_position?: string | null
          bc_reference?: string | null
          created_at?: string | null
          currency?: string | null
          early_bird_deadline?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          institution_id?: string | null
          institution_uuid?: string | null
          location_city?: string | null
          location_country?: string | null
          name: string
          notification_sender_email?: string | null
          notification_sender_name?: string | null
          payment_due_days?: number | null
          price?: number | null
          short_name?: string | null
          slug: string
          start_date?: string | null
          status?: string | null
          stripe_tax_rate_id?: string | null
          support_phone?: string | null
          supported_languages?: string[] | null
          tax_location?: string | null
          vat_rate?: number | null
          venue_name?: string | null
          website_url?: string | null
        }
        Update: {
          additional_admins?: string[] | null
          bc_position?: string | null
          bc_reference?: string | null
          created_at?: string | null
          currency?: string | null
          early_bird_deadline?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          institution_id?: string | null
          institution_uuid?: string | null
          location_city?: string | null
          location_country?: string | null
          name?: string
          notification_sender_email?: string | null
          notification_sender_name?: string | null
          payment_due_days?: number | null
          price?: number | null
          short_name?: string | null
          slug?: string
          start_date?: string | null
          status?: string | null
          stripe_tax_rate_id?: string | null
          support_phone?: string | null
          supported_languages?: string[] | null
          tax_location?: string | null
          vat_rate?: number | null
          venue_name?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_institution_uuid_fkey"
            columns: ["institution_uuid"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitors: {
        Row: {
          company_name: string
          event_id: string | null
          id: string
          tier: string | null
        }
        Insert: {
          company_name: string
          event_id?: string | null
          id?: string
          tier?: string | null
        }
        Update: {
          company_name?: string
          event_id?: string | null
          id?: string
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibitors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          address: string
          bc_generic_customer_id: string | null
          bc_payment_method_bank: string | null
          bc_payment_method_card: string | null
          billing_email: string | null
          created_at: string | null
          id: string | null
          invoice_email: string
          name: string
          oib: string
          stripe_connect_id: string | null
        }
        Insert: {
          address: string
          bc_generic_customer_id?: string | null
          bc_payment_method_bank?: string | null
          bc_payment_method_card?: string | null
          billing_email?: string | null
          created_at?: string | null
          id?: string | null
          invoice_email: string
          name: string
          oib: string
          stripe_connect_id?: string | null
        }
        Update: {
          address?: string
          bc_generic_customer_id?: string | null
          bc_payment_method_bank?: string | null
          bc_payment_method_card?: string | null
          billing_email?: string | null
          created_at?: string | null
          id?: string | null
          invoice_email?: string
          name?: string
          oib?: string
          stripe_connect_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          attendee_id: string | null
          exhibitor_id: string | null
          id: string
          notes: string | null
          scanned_at: string | null
        }
        Insert: {
          attendee_id?: string | null
          exhibitor_id?: string | null
          id?: string
          notes?: string | null
          scanned_at?: string | null
        }
        Update: {
          attendee_id?: string | null
          exhibitor_id?: string | null
          id?: string
          notes?: string | null
          scanned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          attendee_id: string | null
          description: string
          id: string
          order_id: string | null
          price_at_purchase: number | null
          quantity: number | null
          service_id: string | null
          ticket_type_id: string | null
          total_price: number
          unit_price: number
          vat_amount: number
        }
        Insert: {
          attendee_id?: string | null
          description: string
          id?: string
          order_id?: string | null
          price_at_purchase?: number | null
          quantity?: number | null
          service_id?: string | null
          ticket_type_id?: string | null
          total_price: number
          unit_price: number
          vat_amount: number
        }
        Update: {
          attendee_id?: string | null
          description?: string
          id?: string
          order_id?: string | null
          price_at_purchase?: number | null
          quantity?: number | null
          service_id?: string | null
          ticket_type_id?: string | null
          total_price?: number
          unit_price?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_tiers"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "event_services"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attendee_id: string | null
          bc_customer_no: string | null
          bc_invoice_id: string | null
          bc_invoice_number: string | null
          created_at: string | null
          event_id: string | null
          id: string
          order_number: number
          payer_address: string | null
          payer_name: string
          payer_oib: string | null
          payer_type: Database["public"]["Enums"]["payer_type"]
          pdf_url: string | null
          po_number: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          total_amount: number | null
        }
        Insert: {
          attendee_id?: string | null
          bc_customer_no?: string | null
          bc_invoice_id?: string | null
          bc_invoice_number?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          order_number?: number
          payer_address?: string | null
          payer_name: string
          payer_oib?: string | null
          payer_type: Database["public"]["Enums"]["payer_type"]
          pdf_url?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          total_amount?: number | null
        }
        Update: {
          attendee_id?: string | null
          bc_customer_no?: string | null
          bc_invoice_id?: string | null
          bc_invoice_number?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          order_number?: number
          payer_address?: string | null
          payer_name?: string
          payer_oib?: string | null
          payer_type?: Database["public"]["Enums"]["payer_type"]
          pdf_url?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_mappings: {
        Row: {
          bc_code: string
          created_at: string
          id: number
          stripe_brand: string
        }
        Insert: {
          bc_code: string
          created_at?: string
          id?: number
          stripe_brand: string
        }
        Update: {
          bc_code?: string
          created_at?: string
          id?: number
          stripe_brand?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          billing_email: string | null
          company_name: string | null
          company_oib: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          institution: string | null
          institution_id: string | null
          institution_uuid: string | null
          last_name: string | null
          oib: string | null
          phone: string | null
          role: string | null
          telegram_id: string | null
        }
        Insert: {
          billing_email?: string | null
          company_name?: string | null
          company_oib?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          institution?: string | null
          institution_id?: string | null
          institution_uuid?: string | null
          last_name?: string | null
          oib?: string | null
          phone?: string | null
          role?: string | null
          telegram_id?: string | null
        }
        Update: {
          billing_email?: string | null
          company_name?: string | null
          company_oib?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          institution?: string | null
          institution_id?: string | null
          institution_uuid?: string | null
          last_name?: string | null
          oib?: string | null
          phone?: string | null
          role?: string | null
          telegram_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_uuid_fkey"
            columns: ["institution_uuid"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          end_time: string | null
          event_id: string | null
          id: string
          location: string | null
          speaker_names: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          end_time?: string | null
          event_id?: string | null
          id?: string
          location?: string | null
          speaker_names?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          end_time?: string | null
          event_id?: string | null
          id?: string
          location?: string | null
          speaker_names?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          capacity: number | null
          created_at: string | null
          description: string | null
          erp_code: string | null
          event_id: string | null
          id: string
          name: string
          price: number
          sales_end: string | null
          sales_start: string | null
          status: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          erp_code?: string | null
          event_id?: string | null
          id?: string
          name: string
          price?: number
          sales_end?: string | null
          sales_start?: string | null
          status?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          erp_code?: string | null
          event_id?: string | null
          id?: string
          name?: string
          price?: number
          sales_end?: string | null
          sales_start?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_chat_full_view: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          institution_name: string | null
          message_content: string | null
          phone_number: string | null
          role: string | null
          sender_type: string | null
          user_name: string | null
        }
        Relationships: []
      }
      view_events_full: {
        Row: {
          additional_admins: string[] | null
          bc_position: string | null
          bc_reference: string | null
          created_at: string | null
          currency: string | null
          early_bird_deadline: string | null
          end_date: string | null
          event_id: string | null
          id: string | null
          institution_id: string | null
          institution_uuid: string | null
          location_city: string | null
          location_country: string | null
          name: string | null
          notification_sender_email: string | null
          notification_sender_name: string | null
          payment_due_days: number | null
          price: number | null
          short_name: string | null
          slug: string | null
          start_date: string | null
          status: string | null
          support_phone: string | null
          supported_languages: string[] | null
          tax_location: string | null
          ticket_options: Json | null
          vat_rate: number | null
          venue_name: string | null
          website_url: string | null
        }
        Insert: {
          additional_admins?: string[] | null
          bc_position?: string | null
          bc_reference?: string | null
          created_at?: string | null
          currency?: string | null
          early_bird_deadline?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string | null
          institution_id?: string | null
          institution_uuid?: string | null
          location_city?: string | null
          location_country?: string | null
          name?: string | null
          notification_sender_email?: string | null
          notification_sender_name?: string | null
          payment_due_days?: number | null
          price?: number | null
          short_name?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          support_phone?: string | null
          supported_languages?: string[] | null
          tax_location?: string | null
          ticket_options?: never
          vat_rate?: number | null
          venue_name?: string | null
          website_url?: string | null
        }
        Update: {
          additional_admins?: string[] | null
          bc_position?: string | null
          bc_reference?: string | null
          created_at?: string | null
          currency?: string | null
          early_bird_deadline?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string | null
          institution_id?: string | null
          institution_uuid?: string | null
          location_city?: string | null
          location_country?: string | null
          name?: string | null
          notification_sender_email?: string | null
          notification_sender_name?: string | null
          payment_due_days?: number | null
          price?: number | null
          short_name?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          support_phone?: string | null
          supported_languages?: string[] | null
          tax_location?: string | null
          ticket_options?: never
          vat_rate?: number | null
          venue_name?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_institution_uuid_fkey"
            columns: ["institution_uuid"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_user_wizard: {
        Args: {
          email_input: string
          first_name_input: string
          institution_id_input: string
          last_name_input: string
          role_input: string
        }
        Returns: string
      }
    }
    Enums: {
      payer_type: "individual" | "company" | "sponsor"
      payment_status: "draft" | "issued" | "paid" | "overdue" | "refunded"
      registration_status: "pending" | "approved" | "cancelled"
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
      payer_type: ["individual", "company", "sponsor"],
      payment_status: ["draft", "issued", "paid", "overdue", "refunded"],
      registration_status: ["pending", "approved", "cancelled"],
    },
  },
} as const
