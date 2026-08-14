export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MonitoringStatusDb = "ACTIVE" | "PAUSED" | "MATCH_FOUND" | "ERROR" | "DISABLED";
export type AvailabilityStatusDb = "AVAILABLE" | "NOT_AVAILABLE" | "TEMPORARY_ERROR";
export type NotificationTypeDb = "APPOINTMENT_AVAILABLE" | "MONITORING_ERROR" | "SYSTEM";
export type NotificationChannelDb = "IN_APP" | "EMAIL" | "PUSH";
export type NotificationStatusDb = "PENDING" | "SENT" | "FAILED" | "READ" | "DISMISSED";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monitoring_requests: {
        Row: {
          id: string;
          user_id: string;
          country: string;
          destination: string;
          centre: string;
          visa_category: string;
          earliest_date: string | null;
          latest_date: string | null;
          status: MonitoringStatusDb;
          check_interval_minutes: number;
          last_checked_at: string | null;
          last_available_at: string | null;
          last_error_code: string | null;
          consecutive_errors: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          country?: string;
          destination: string;
          centre: string;
          visa_category: string;
          earliest_date?: string | null;
          latest_date?: string | null;
          status?: MonitoringStatusDb;
          check_interval_minutes?: number;
          last_checked_at?: string | null;
          last_available_at?: string | null;
          last_error_code?: string | null;
          consecutive_errors?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          country?: string;
          destination?: string;
          centre?: string;
          visa_category?: string;
          earliest_date?: string | null;
          latest_date?: string | null;
          status?: MonitoringStatusDb;
          check_interval_minutes?: number;
          last_checked_at?: string | null;
          last_available_at?: string | null;
          last_error_code?: string | null;
          consecutive_errors?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      availability_checks: {
        Row: {
          id: string;
          monitoring_request_id: string;
          checked_at: string;
          status: AvailabilityStatusDb;
          available: boolean;
          result_hash: string | null;
          error_code: string | null;
          response_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          monitoring_request_id: string;
          checked_at?: string;
          status: AvailabilityStatusDb;
          available: boolean;
          result_hash?: string | null;
          error_code?: string | null;
          response_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          monitoring_request_id?: string;
          checked_at?: string;
          status?: AvailabilityStatusDb;
          available?: boolean;
          result_hash?: string | null;
          error_code?: string | null;
          response_time_ms?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      appointment_slots: {
        Row: {
          id: string;
          availability_check_id: string;
          appointment_date: string;
          appointment_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          availability_check_id: string;
          appointment_date: string;
          appointment_time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          availability_check_id?: string;
          appointment_date?: string;
          appointment_time?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          monitoring_request_id: string | null;
          type: NotificationTypeDb;
          channel: NotificationChannelDb;
          title: string;
          message: string;
          status: NotificationStatusDb;
          result_hash: string | null;
          sent_at: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          monitoring_request_id?: string | null;
          type: NotificationTypeDb;
          channel: NotificationChannelDb;
          title: string;
          message: string;
          status?: NotificationStatusDb;
          result_hash?: string | null;
          sent_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          monitoring_request_id?: string | null;
          type?: NotificationTypeDb;
          channel?: NotificationChannelDb;
          title?: string;
          message?: string;
          status?: NotificationStatusDb;
          result_hash?: string | null;
          sent_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_enabled: boolean;
          push_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_enabled?: boolean;
          push_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_enabled?: boolean;
          push_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      destinations: {
        Row: {
          code: string;
          label: string;
          official_url: string | null;
          enabled: boolean;
          sort_order: number;
        };
        Insert: {
          code: string;
          label: string;
          official_url?: string | null;
          enabled?: boolean;
          sort_order?: number;
        };
        Update: {
          code?: string;
          label?: string;
          official_url?: string | null;
          enabled?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      centres: {
        Row: { code: string; label: string; country: string; enabled: boolean; sort_order: number };
        Insert: { code: string; label: string; country?: string; enabled?: boolean; sort_order?: number };
        Update: { code?: string; label?: string; country?: string; enabled?: boolean; sort_order?: number };
        Relationships: [];
      };
      visa_categories: {
        Row: {
          code: string;
          destination: string;
          label: string;
          enabled: boolean;
          sort_order: number;
        };
        Insert: {
          code: string;
          destination: string;
          label: string;
          enabled?: boolean;
          sort_order?: number;
        };
        Update: {
          code?: string;
          destination?: string;
          label?: string;
          enabled?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      app_config: {
        Row: { key: string; value: number };
        Insert: { key: string; value: number };
        Update: { key?: string; value?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      monitoring_status: MonitoringStatusDb;
      availability_source_status: AvailabilityStatusDb;
      notification_type: NotificationTypeDb;
      notification_channel: NotificationChannelDb;
      notification_status: NotificationStatusDb;
    };
    CompositeTypes: Record<string, never>;
  };
};
