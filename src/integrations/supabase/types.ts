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
      admin_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          message: string
          read_by: string[] | null
          resolved_at: string | null
          resolved_by: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          message: string
          read_by?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          message?: string
          read_by?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          institution_id: string | null
          invited_by: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          institution_id?: string | null
          invited_by?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          institution_id?: string | null
          invited_by?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bc_customer_posting_groups: {
        Row: {
          code: string
          description: string
          id: number
          is_active: boolean | null
          receivables_account: string | null
        }
        Insert: {
          code: string
          description: string
          id?: number
          is_active?: boolean | null
          receivables_account?: string | null
        }
        Update: {
          code?: string
          description?: string
          id?: number
          is_active?: boolean | null
          receivables_account?: string | null
        }
        Relationships: []
      }
      bc_eu_countries: {
        Row: {
          country_code: string
          country_name: string
        }
        Insert: {
          country_code: string
          country_name: string
        }
        Update: {
          country_code?: string
          country_name?: string
        }
        Relationships: []
      }
      bc_gen_business_posting_groups: {
        Row: {
          code: string
          def_vat_bus_posting_group: string | null
          description: string
          id: number
          is_active: boolean | null
        }
        Insert: {
          code: string
          def_vat_bus_posting_group?: string | null
          description: string
          id?: number
          is_active?: boolean | null
        }
        Update: {
          code?: string
          def_vat_bus_posting_group?: string | null
          description?: string
          id?: number
          is_active?: boolean | null
        }
        Relationships: []
      }
      bc_items: {
        Row: {
          base_unit_of_measure: string | null
          blocked: boolean | null
          description: string
          description2: string | null
          gen_prod_posting_group: string | null
          id: number
          no: string
          synced_at: string | null
          type: string | null
          unit_price: number | null
          vat_prod_posting_group: string | null
        }
        Insert: {
          base_unit_of_measure?: string | null
          blocked?: boolean | null
          description: string
          description2?: string | null
          gen_prod_posting_group?: string | null
          id?: number
          no: string
          synced_at?: string | null
          type?: string | null
          unit_price?: number | null
          vat_prod_posting_group?: string | null
        }
        Update: {
          base_unit_of_measure?: string | null
          blocked?: boolean | null
          description?: string
          description2?: string | null
          gen_prod_posting_group?: string | null
          id?: number
          no?: string
          synced_at?: string | null
          type?: string | null
          unit_price?: number | null
          vat_prod_posting_group?: string | null
        }
        Relationships: []
      }
      bc_payment_terms: {
        Row: {
          code: string
          description: string
          due_date_calculation: string | null
          id: number
          is_active: boolean | null
        }
        Insert: {
          code: string
          description: string
          due_date_calculation?: string | null
          id?: number
          is_active?: boolean | null
        }
        Update: {
          code?: string
          description?: string
          due_date_calculation?: string | null
          id?: number
          is_active?: boolean | null
        }
        Relationships: []
      }
      bc_vat_business_posting_groups: {
        Row: {
          code: string
          description: string
          id: number
          is_active: boolean | null
        }
        Insert: {
          code: string
          description: string
          id?: number
          is_active?: boolean | null
        }
        Update: {
          code?: string
          description?: string
          id?: number
          is_active?: boolean | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          event_id: string | null
          event_name: string | null
          id: string
          message: Json
          Sender: Json | null
          sender_name: string | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string
          message: Json
          Sender?: Json | null
          sender_name?: string | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string
          message?: Json
          Sender?: Json | null
          sender_name?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "view_events_full"
            referencedColumns: ["id"]
          },
        ]
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
          approval_note: string | null
          approved_at: string | null
          approved_by: string | null
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
          rejection_reason: string | null
          status: string | null
          translations: Json | null
        }
        Insert: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
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
          rejection_reason?: string | null
          status?: string | null
          translations?: Json | null
        }
        Update: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
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
          rejection_reason?: string | null
          status?: string | null
          translations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_services_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          bc_customer_posting_group: string | null
          bc_gen_bus_posting_group: string | null
          bc_payment_terms_code: string | null
          bc_position: string | null
          bc_reference: string | null
          bc_vat_bus_posting_group: string | null
          branding_banner_url: string | null
          branding_favicon_url: string | null
          branding_logo_url: string | null
          branding_primary_color: string | null
          branding_secondary_color: string | null
          branding_text_color: string | null
          cancellation_policy: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          early_bird_deadline: string | null
          end_date: string | null
          event_id: string | null
          event_type: string | null
          id: string
          institution_id: string | null
          institution_uuid: string | null
          location_address: string | null
          location_city: string | null
          location_country: string | null
          location_postal_code: string | null
          name: string
          notification_sender_email: string | null
          notification_sender_name: string | null
          payment_due_days: number | null
          price: number | null
          rejection_reason: string | null
          short_name: string | null
          slug: string
          start_date: string | null
          status: string | null
          stripe_tax_rate_id: string | null
          support_phone: string | null
          supported_languages: string[] | null
          tax_location: string | null
          terms_url: string | null
          translations: Json | null
          vat_rate: number | null
          venue_name: string | null
          website_url: string | null
        }
        Insert: {
          additional_admins?: string[] | null
          bc_customer_posting_group?: string | null
          bc_gen_bus_posting_group?: string | null
          bc_payment_terms_code?: string | null
          bc_position?: string | null
          bc_reference?: string | null
          bc_vat_bus_posting_group?: string | null
          branding_banner_url?: string | null
          branding_favicon_url?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          branding_secondary_color?: string | null
          branding_text_color?: string | null
          cancellation_policy?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          early_bird_deadline?: string | null
          end_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          institution_id?: string | null
          institution_uuid?: string | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_postal_code?: string | null
          name: string
          notification_sender_email?: string | null
          notification_sender_name?: string | null
          payment_due_days?: number | null
          price?: number | null
          rejection_reason?: string | null
          short_name?: string | null
          slug: string
          start_date?: string | null
          status?: string | null
          stripe_tax_rate_id?: string | null
          support_phone?: string | null
          supported_languages?: string[] | null
          tax_location?: string | null
          terms_url?: string | null
          translations?: Json | null
          vat_rate?: number | null
          venue_name?: string | null
          website_url?: string | null
        }
        Update: {
          additional_admins?: string[] | null
          bc_customer_posting_group?: string | null
          bc_gen_bus_posting_group?: string | null
          bc_payment_terms_code?: string | null
          bc_position?: string | null
          bc_reference?: string | null
          bc_vat_bus_posting_group?: string | null
          branding_banner_url?: string | null
          branding_favicon_url?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          branding_secondary_color?: string | null
          branding_text_color?: string | null
          cancellation_policy?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          early_bird_deadline?: string | null
          end_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          institution_id?: string | null
          institution_uuid?: string | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_postal_code?: string | null
          name?: string
          notification_sender_email?: string | null
          notification_sender_name?: string | null
          payment_due_days?: number | null
          price?: number | null
          rejection_reason?: string | null
          short_name?: string | null
          slug?: string
          start_date?: string | null
          status?: string | null
          stripe_tax_rate_id?: string | null
          support_phone?: string | null
          supported_languages?: string[] | null
          tax_location?: string | null
          terms_url?: string | null
          translations?: Json | null
          vat_rate?: number | null
          venue_name?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_bc_customer_posting_group_fkey"
            columns: ["bc_customer_posting_group"]
            isOneToOne: false
            referencedRelation: "bc_customer_posting_groups"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "events_bc_gen_bus_posting_group_fkey"
            columns: ["bc_gen_bus_posting_group"]
            isOneToOne: false
            referencedRelation: "bc_gen_business_posting_groups"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "events_bc_payment_terms_code_fkey"
            columns: ["bc_payment_terms_code"]
            isOneToOne: false
            referencedRelation: "bc_payment_terms"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "events_bc_vat_bus_posting_group_fkey"
            columns: ["bc_vat_bus_posting_group"]
            isOneToOne: false
            referencedRelation: "bc_vat_business_posting_groups"
            referencedColumns: ["code"]
          },
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
          city: string | null
          country: string | null
          created_at: string | null
          facebook_url: string | null
          id: string | null
          instagram_url: string | null
          invoice_email: string
          linkedin_url: string | null
          name: string
          oib: string
          phone: string | null
          postal_code: string | null
          stripe_connect_id: string | null
          website: string | null
        }
        Insert: {
          address: string
          bc_generic_customer_id?: string | null
          bc_payment_method_bank?: string | null
          bc_payment_method_card?: string | null
          billing_email?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string | null
          instagram_url?: string | null
          invoice_email: string
          linkedin_url?: string | null
          name: string
          oib: string
          phone?: string | null
          postal_code?: string | null
          stripe_connect_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          bc_generic_customer_id?: string | null
          bc_payment_method_bank?: string | null
          bc_payment_method_card?: string | null
          billing_email?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string | null
          instagram_url?: string | null
          invoice_email?: string
          linkedin_url?: string | null
          name?: string
          oib?: string
          phone?: string | null
          postal_code?: string | null
          stripe_connect_id?: string | null
          website?: string | null
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
            referencedRelation: "attendee_invoice_summary"
            referencedColumns: ["attendee_id"]
          },
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
          erp_code: string | null
          id: string
          item_type: string | null
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
          erp_code?: string | null
          id?: string
          item_type?: string | null
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
          erp_code?: string | null
          id?: string
          item_type?: string | null
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
            referencedRelation: "attendee_invoice_summary"
            referencedColumns: ["attendee_id"]
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
            referencedRelation: "attendee_invoice_summary"
            referencedColumns: ["order_id"]
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
          billing_email: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          customer_posting_group: string | null
          event_id: string | null
          gen_bus_posting_group: string | null
          id: string
          is_group_order: boolean | null
          order_number: number
          payer_address: string | null
          payer_city: string | null
          payer_country_code: string | null
          payer_country_name: string | null
          payer_name: string
          payer_oib: string | null
          payer_postal_code: string | null
          payer_type: Database["public"]["Enums"]["payer_type"]
          payment_method: string | null
          pdf_url: string | null
          po_number: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_session_expires_at: string | null
          stripe_session_id: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          terms_ip: string | null
          total_amount: number | null
          vat_bus_posting_group: string | null
        }
        Insert: {
          attendee_id?: string | null
          bc_customer_no?: string | null
          bc_invoice_id?: string | null
          bc_invoice_number?: string | null
          billing_email?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_posting_group?: string | null
          event_id?: string | null
          gen_bus_posting_group?: string | null
          id?: string
          is_group_order?: boolean | null
          order_number?: number
          payer_address?: string | null
          payer_city?: string | null
          payer_country_code?: string | null
          payer_country_name?: string | null
          payer_name: string
          payer_oib?: string | null
          payer_postal_code?: string | null
          payer_type: Database["public"]["Enums"]["payer_type"]
          payment_method?: string | null
          pdf_url?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_session_expires_at?: string | null
          stripe_session_id?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          terms_ip?: string | null
          total_amount?: number | null
          vat_bus_posting_group?: string | null
        }
        Update: {
          attendee_id?: string | null
          bc_customer_no?: string | null
          bc_invoice_id?: string | null
          bc_invoice_number?: string | null
          billing_email?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_posting_group?: string | null
          event_id?: string | null
          gen_bus_posting_group?: string | null
          id?: string
          is_group_order?: boolean | null
          order_number?: number
          payer_address?: string | null
          payer_city?: string | null
          payer_country_code?: string | null
          payer_country_name?: string | null
          payer_name?: string
          payer_oib?: string | null
          payer_postal_code?: string | null
          payer_type?: Database["public"]["Enums"]["payer_type"]
          payment_method?: string | null
          pdf_url?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_session_expires_at?: string | null
          stripe_session_id?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          terms_ip?: string | null
          total_amount?: number | null
          vat_bus_posting_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendee_invoice_summary"
            referencedColumns: ["attendee_id"]
          },
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
          description: string | null
          id: number
          internal_code: string | null
          is_active: boolean | null
          stripe_brand: string
        }
        Insert: {
          bc_code: string
          created_at?: string
          description?: string | null
          id?: number
          internal_code?: string | null
          is_active?: boolean | null
          stripe_brand: string
        }
        Update: {
          bc_code?: string
          created_at?: string
          description?: string | null
          id?: number
          internal_code?: string | null
          is_active?: boolean | null
          stripe_brand?: string
        }
        Relationships: []
      }
      pricing_leads: {
        Row: {
          company: string | null
          congress_name: string | null
          created_at: string | null
          duration: string | null
          email: string
          estimated_fee: string | null
          event_scale: string | null
          expected_participants: string | null
          first_name: string
          funding_source: string | null
          has_registration_fees: boolean | null
          id: string
          last_name: string
          services_needed: string[] | null
        }
        Insert: {
          company?: string | null
          congress_name?: string | null
          created_at?: string | null
          duration?: string | null
          email: string
          estimated_fee?: string | null
          event_scale?: string | null
          expected_participants?: string | null
          first_name: string
          funding_source?: string | null
          has_registration_fees?: boolean | null
          id?: string
          last_name: string
          services_needed?: string[] | null
        }
        Update: {
          company?: string | null
          congress_name?: string | null
          created_at?: string | null
          duration?: string | null
          email?: string
          estimated_fee?: string | null
          event_scale?: string | null
          expected_participants?: string | null
          first_name?: string
          funding_source?: string | null
          has_registration_fees?: boolean | null
          id?: string
          last_name?: string
          services_needed?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          billing_email: string | null
          city: string | null
          company_name: string | null
          company_oib: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          institution: string | null
          institution_id: string | null
          institution_uuid: string | null
          last_name: string | null
          oib: string | null
          phone: string | null
          postal_code: string | null
          role: string | null
          telegram_id: string | null
          whatsapp_id: string | null
        }
        Insert: {
          address?: string | null
          billing_email?: string | null
          city?: string | null
          company_name?: string | null
          company_oib?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          institution?: string | null
          institution_id?: string | null
          institution_uuid?: string | null
          last_name?: string | null
          oib?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string | null
          telegram_id?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          address?: string | null
          billing_email?: string | null
          city?: string | null
          company_name?: string | null
          company_oib?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          institution?: string | null
          institution_id?: string | null
          institution_uuid?: string | null
          last_name?: string | null
          oib?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string | null
          telegram_id?: string | null
          whatsapp_id?: string | null
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
      salespersons: {
        Row: {
          bc_code: string
          created_at: string | null
          email: string | null
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          bc_code: string
          created_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          bc_code?: string
          created_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
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
          approval_note: string | null
          approved_at: string | null
          approved_by: string | null
          capacity: number | null
          created_at: string | null
          description: string | null
          erp_code: string | null
          event_id: string | null
          id: string
          name: string
          price: number
          rejection_reason: string | null
          sales_end: string | null
          sales_start: string | null
          short_name: string | null
          status: string | null
          translations: Json | null
        }
        Insert: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          erp_code?: string | null
          event_id?: string | null
          id?: string
          name: string
          price?: number
          rejection_reason?: string | null
          sales_end?: string | null
          sales_start?: string | null
          short_name?: string | null
          status?: string | null
          translations?: Json | null
        }
        Update: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          erp_code?: string | null
          event_id?: string | null
          id?: string
          name?: string
          price?: number
          rejection_reason?: string | null
          sales_end?: string | null
          sales_start?: string | null
          short_name?: string | null
          status?: string | null
          translations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      whatsapp_session: {
        Row: {
          attendees_collected: number | null
          attendees_json: string | null
          billing_email: string | null
          cart_items: string | null
          cart_services: string | null
          cart_services_confirmed: boolean | null
          company_address: string | null
          company_name: string | null
          company_oib: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_mode: string | null
          created_at: string | null
          draft_order_id: string | null
          email: string | null
          event_id: string | null
          event_name: string | null
          event_slug: string | null
          first_name: string | null
          last_ai_message: string | null
          last_human_message: string | null
          last_intent: string | null
          last_message_at: string | null
          last_message_id: string | null
          last_name: string | null
          last_user_message: string | null
          next_action: string | null
          participants_count: number | null
          payer_city: string | null
          payer_country_code: string | null
          payer_country_name: string | null
          payer_postal_code: string | null
          payer_type: string | null
          payment_method: string | null
          po_number: string | null
          registration_type: string | null
          step: string | null
          updated_at: string | null
          wa_id: string
        }
        Insert: {
          attendees_collected?: number | null
          attendees_json?: string | null
          billing_email?: string | null
          cart_items?: string | null
          cart_services?: string | null
          cart_services_confirmed?: boolean | null
          company_address?: string | null
          company_name?: string | null
          company_oib?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_mode?: string | null
          created_at?: string | null
          draft_order_id?: string | null
          email?: string | null
          event_id?: string | null
          event_name?: string | null
          event_slug?: string | null
          first_name?: string | null
          last_ai_message?: string | null
          last_human_message?: string | null
          last_intent?: string | null
          last_message_at?: string | null
          last_message_id?: string | null
          last_name?: string | null
          last_user_message?: string | null
          next_action?: string | null
          participants_count?: number | null
          payer_city?: string | null
          payer_country_code?: string | null
          payer_country_name?: string | null
          payer_postal_code?: string | null
          payer_type?: string | null
          payment_method?: string | null
          po_number?: string | null
          registration_type?: string | null
          step?: string | null
          updated_at?: string | null
          wa_id: string
        }
        Update: {
          attendees_collected?: number | null
          attendees_json?: string | null
          billing_email?: string | null
          cart_items?: string | null
          cart_services?: string | null
          cart_services_confirmed?: boolean | null
          company_address?: string | null
          company_name?: string | null
          company_oib?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_mode?: string | null
          created_at?: string | null
          draft_order_id?: string | null
          email?: string | null
          event_id?: string | null
          event_name?: string | null
          event_slug?: string | null
          first_name?: string | null
          last_ai_message?: string | null
          last_human_message?: string | null
          last_intent?: string | null
          last_message_at?: string | null
          last_message_id?: string | null
          last_name?: string | null
          last_user_message?: string | null
          next_action?: string | null
          participants_count?: number | null
          payer_city?: string | null
          payer_country_code?: string | null
          payer_country_name?: string | null
          payer_postal_code?: string | null
          payer_type?: string | null
          payment_method?: string | null
          po_number?: string | null
          registration_type?: string | null
          step?: string | null
          updated_at?: string | null
          wa_id?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          attendees_json: string | null
          billing_email: string | null
          company_address: string | null
          company_name: string | null
          company_oib: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_mode: string | null
          draft_order_id: string | null
          email: string | null
          event_id: string | null
          event_name: string | null
          event_slug: string | null
          first_name: string | null
          last_intent: string | null
          last_name: string | null
          last_user_message: string | null
          participants_count: number | null
          payer_city: string | null
          payer_country_code: string | null
          payer_country_name: string | null
          payer_postal_code: string | null
          payer_type: string | null
          payment_method: string | null
          po_number: string | null
          registration_type: string | null
          selected_service_ids: string | null
          selected_ticket_id: string | null
          selected_ticket_label: string | null
          step: string | null
          updated_at: string | null
          wa_id: string
        }
        Insert: {
          attendees_json?: string | null
          billing_email?: string | null
          company_address?: string | null
          company_name?: string | null
          company_oib?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_mode?: string | null
          draft_order_id?: string | null
          email?: string | null
          event_id?: string | null
          event_name?: string | null
          event_slug?: string | null
          first_name?: string | null
          last_intent?: string | null
          last_name?: string | null
          last_user_message?: string | null
          participants_count?: number | null
          payer_city?: string | null
          payer_country_code?: string | null
          payer_country_name?: string | null
          payer_postal_code?: string | null
          payer_type?: string | null
          payment_method?: string | null
          po_number?: string | null
          registration_type?: string | null
          selected_service_ids?: string | null
          selected_ticket_id?: string | null
          selected_ticket_label?: string | null
          step?: string | null
          updated_at?: string | null
          wa_id: string
        }
        Update: {
          attendees_json?: string | null
          billing_email?: string | null
          company_address?: string | null
          company_name?: string | null
          company_oib?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_mode?: string | null
          draft_order_id?: string | null
          email?: string | null
          event_id?: string | null
          event_name?: string | null
          event_slug?: string | null
          first_name?: string | null
          last_intent?: string | null
          last_name?: string | null
          last_user_message?: string | null
          participants_count?: number | null
          payer_city?: string | null
          payer_country_code?: string | null
          payer_country_name?: string | null
          payer_postal_code?: string | null
          payer_type?: string | null
          payment_method?: string | null
          po_number?: string | null
          registration_type?: string | null
          selected_service_ids?: string | null
          selected_ticket_id?: string | null
          selected_ticket_label?: string | null
          step?: string | null
          updated_at?: string | null
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_event_id_fkey"
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
      admin_users_with_institutions: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          institution_id: string | null
          institution_name: string | null
          invited_by: string | null
          role: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendee_invoice_summary: {
        Row: {
          attendee_id: string | null
          bc_customer_no: string | null
          bc_invoice_id: string | null
          bc_invoice_number: string | null
          checked_in: boolean | null
          email: string | null
          event_id: string | null
          first_name: string | null
          is_group_order: boolean | null
          last_name: string | null
          order_id: string | null
          order_number: number | null
          order_status: Database["public"]["Enums"]["payment_status"] | null
          payer_name: string | null
          payer_type: Database["public"]["Enums"]["payer_type"] | null
          payment_method: string | null
          payment_status: string | null
          registered_at: string | null
          registration_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          ticket_tier_id: string | null
          total_amount: number | null
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
            foreignKeyName: "attendees_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      view_events_full: {
        Row: {
          additional_admins: string[] | null
          available_services: Json | null
          bc_customer_posting_group: string | null
          bc_gen_bus_posting_group: string | null
          bc_payment_terms_code: string | null
          bc_position: string | null
          bc_reference: string | null
          bc_vat_bus_posting_group: string | null
          branding_banner_url: string | null
          branding_favicon_url: string | null
          branding_logo_url: string | null
          branding_primary_color: string | null
          branding_secondary_color: string | null
          branding_text_color: string | null
          cancellation_policy: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          early_bird_deadline: string | null
          end_date: string | null
          event_id: string | null
          event_type: string | null
          id: string | null
          institution_id: string | null
          institution_uuid: string | null
          location_address: string | null
          location_city: string | null
          location_country: string | null
          location_postal_code: string | null
          name: string | null
          notification_sender_email: string | null
          notification_sender_name: string | null
          payment_due_days: number | null
          price: number | null
          short_name: string | null
          slug: string | null
          start_date: string | null
          status: string | null
          stripe_tax_rate_id: string | null
          support_phone: string | null
          supported_languages: string[] | null
          tax_location: string | null
          terms_url: string | null
          ticket_options: Json | null
          vat_rate: number | null
          venue_name: string | null
          website_url: string | null
        }
        Insert: {
          additional_admins?: string[] | null
          available_services?: never
          bc_customer_posting_group?: string | null
          bc_gen_bus_posting_group?: string | null
          bc_payment_terms_code?: string | null
          bc_position?: string | null
          bc_reference?: string | null
          bc_vat_bus_posting_group?: string | null
          branding_banner_url?: string | null
          branding_favicon_url?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          branding_secondary_color?: string | null
          branding_text_color?: string | null
          cancellation_policy?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          early_bird_deadline?: string | null
          end_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string | null
          institution_id?: string | null
          institution_uuid?: string | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_postal_code?: string | null
          name?: string | null
          notification_sender_email?: string | null
          notification_sender_name?: string | null
          payment_due_days?: number | null
          price?: number | null
          short_name?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          stripe_tax_rate_id?: string | null
          support_phone?: string | null
          supported_languages?: string[] | null
          tax_location?: string | null
          terms_url?: string | null
          ticket_options?: never
          vat_rate?: number | null
          venue_name?: string | null
          website_url?: string | null
        }
        Update: {
          additional_admins?: string[] | null
          available_services?: never
          bc_customer_posting_group?: string | null
          bc_gen_bus_posting_group?: string | null
          bc_payment_terms_code?: string | null
          bc_position?: string | null
          bc_reference?: string | null
          bc_vat_bus_posting_group?: string | null
          branding_banner_url?: string | null
          branding_favicon_url?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          branding_secondary_color?: string | null
          branding_text_color?: string | null
          cancellation_policy?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          early_bird_deadline?: string | null
          end_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string | null
          institution_id?: string | null
          institution_uuid?: string | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_postal_code?: string | null
          name?: string | null
          notification_sender_email?: string | null
          notification_sender_name?: string | null
          payment_due_days?: number | null
          price?: number | null
          short_name?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          stripe_tax_rate_id?: string | null
          support_phone?: string | null
          supported_languages?: string[] | null
          tax_location?: string | null
          terms_url?: string | null
          ticket_options?: never
          vat_rate?: number | null
          venue_name?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_bc_customer_posting_group_fkey"
            columns: ["bc_customer_posting_group"]
            isOneToOne: false
            referencedRelation: "bc_customer_posting_groups"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "events_bc_gen_bus_posting_group_fkey"
            columns: ["bc_gen_bus_posting_group"]
            isOneToOne: false
            referencedRelation: "bc_gen_business_posting_groups"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "events_bc_payment_terms_code_fkey"
            columns: ["bc_payment_terms_code"]
            isOneToOne: false
            referencedRelation: "bc_payment_terms"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "events_bc_vat_bus_posting_group_fkey"
            columns: ["bc_vat_bus_posting_group"]
            isOneToOne: false
            referencedRelation: "bc_vat_business_posting_groups"
            referencedColumns: ["code"]
          },
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
      auto_complete_past_events: { Args: never; Returns: undefined }
      calculate_event_status: {
        Args: {
          p_current_status: string
          p_end_date: string
          p_start_date: string
        }
        Returns: string
      }
      cancel_expired_pending_orders: { Args: never; Returns: undefined }
      create_registration_items: {
        Args: {
          p_attendees: Json
          p_cart_services: Json
          p_company_name: string
          p_contact_phone: string
          p_event_id: string
          p_order_id: string
          p_payer_type: string
          p_requires_invoice: boolean
          p_ticket_tier_id: string
          p_tier_erp_code: string
          p_tier_name: string
          p_tier_price: number
        }
        Returns: Json
      }
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
      get_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          institution_id: string
          institution_name: string
          invited_by: string
          role: string
        }[]
      }
      get_bc_posting_groups: {
        Args: { p_country_code: string; p_payer_type: string }
        Returns: Json
      }
      get_order_full_data: { Args: { p_order_id: string }; Returns: Json }
      get_session_missing_fields: {
        Args: { p_wa_id: string }
        Returns: {
          missing_fields: string[]
          missing_summary: string
          ready_for_submit: boolean
        }[]
      }
      get_user_event_status: {
        Args: { p_event_id: string; p_phone: string }
        Returns: {
          attendee_id: string
          billing_email: string
          company_name: string
          company_oib: string
          email: string
          event_id: string
          first_name: string
          last_name: string
          payment_status: string
          phone: string
          profile_id: string
          ticket_tier_id: string
        }[]
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      jwt_institution_uuid: { Args: never; Returns: string }
      jwt_is_admin: { Args: never; Returns: boolean }
      jwt_role: { Args: never; Returns: string }
      normalize_phone_to_waid: { Args: { phone: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      update_completed_events: { Args: never; Returns: undefined }
      upsert_wa_session: {
        Args: { p_new_slug?: string; p_wa_id: string }
        Returns: {
          event_slug: string
          wa_id: string
        }[]
      }
      upsert_whatsapp_session:
        | { Args: { p_event_slug?: string; p_wa_id: string }; Returns: Json }
        | {
            Args: {
              p_event_slug?: string
              p_last_message?: string
              p_wa_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_event_slug?: string
              p_force_reset?: boolean
              p_last_message?: string
              p_wa_id: string
            }
            Returns: Json
          }
    }
    Enums: {
      payer_type: "individual" | "company" | "sponsor"
      payment_status:
        | "draft"
        | "issued"
        | "paid"
        | "overdue"
        | "refunded"
        | "cancelled"
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
      payment_status: [
        "draft",
        "issued",
        "paid",
        "overdue",
        "refunded",
        "cancelled",
      ],
      registration_status: ["pending", "approved", "cancelled"],
    },
  },
} as const
