/**
 * Database Types & Supabase Schema Interface for Cloud Stack Club
 */

export type MemberStatus = 'pending' | 'active' | 'inactive';
export type EventStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';
export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'email' 
  | 'phone' 
  | 'number' 
  | 'select' 
  | 'radio' 
  | 'checkbox' 
  | 'file' 
  | 'date';
export type RegistrationStatus = 'registered' | 'confirmed' | 'cancelled' | 'attended';
export type FeedbackStatus = 'unread' | 'read' | 'archived' | 'responded';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface Member {
  id: string;
  registration_id: string;
  uid: string | null;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  year: string | null;
  role_id: string | null;
  is_core_member: boolean;
  joined_at: string;
  status: MemberStatus;
  verification_file_url?: string | null;
  created_at: string;
  updated_at: string;
  role?: Role | null;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  image_url: string | null;
  pdf_url: string | null;
  status: EventStatus;
  registration_enabled: boolean;
  registration_start: string | null;
  registration_end: string | null;
  supports_teams: boolean;
  max_team_size: number | null;
  max_registrations: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventRegistrationForm {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  fields?: EventFormField[];
}

export interface EventFormField {
  id: string;
  form_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  options: string[] | Record<string, any> | null;
  placeholder: string | null;
  help_text: string | null;
  required: boolean;
  display_order: number;
  created_at: string;
}

export interface EventTeam {
  id: string;
  event_id: string;
  team_name: string;
  created_by_registration_id: string | null;
  created_at: string;
  members?: EventTeamMember[];
}

export interface EventTeamMember {
  id: string;
  team_id: string;
  name: string;
  uid: string | null;
  email: string;
  member_id: string | null;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  registration_number: string;
  event_id: string;
  member_id: string | null;
  registrant_name: string;
  registrant_email: string;
  registrant_phone: string | null;
  is_member: boolean;
  team_id: string | null;
  status: RegistrationStatus;
  submitted_at: string;
  updated_at: string;
  team?: EventTeam | null;
  answers?: RegistrationAnswer[];
}

export interface RegistrationAnswer {
  id: string;
  registration_id: string;
  field_id: string;
  answer_text: string | null;
  answer_json: any | null;
  file_url: string | null;
  created_at: string;
}

export interface ContactFeedback {
  id: string;
  name: string;
  email: string;
  message: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface EventRegistrationPayload {
  event_id: string;
  registrant_name: string;
  registrant_email: string;
  registrant_phone?: string;
  uid?: string;
  member_id?: string;
  is_member?: boolean;
  team_name?: string;
  team_members?: { name: string; email: string; uid?: string }[];
  answers?: { field_id: string; answer_text?: string; answer_json?: any; file_url?: string }[];
}

export interface MemberApplicationPayload {
  name: string;
  email: string;
  phone?: string;
  uid: string;
  department?: string;
  year?: string;
  verification_file_url?: string;
}

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: Role;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: Member;
        Insert: {
          id?: string;
          registration_id?: string;
          uid?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          department?: string | null;
          year?: string | null;
          role_id?: string | null;
          is_core_member?: boolean;
          joined_at?: string;
          status?: MemberStatus;
          verification_file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          uid?: string | null;
          name?: string;
          email?: string;
          phone?: string | null;
          department?: string | null;
          year?: string | null;
          role_id?: string | null;
          is_core_member?: boolean;
          joined_at?: string;
          status?: MemberStatus;
          verification_file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: {
          id?: string;
          title: string;
          slug?: string;
          description?: string | null;
          date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          image_url?: string | null;
          pdf_url?: string | null;
          status?: EventStatus;
          registration_enabled?: boolean;
          registration_start?: string | null;
          registration_end?: string | null;
          supports_teams?: boolean;
          max_team_size?: number | null;
          max_registrations?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          image_url?: string | null;
          pdf_url?: string | null;
          status?: EventStatus;
          registration_enabled?: boolean;
          registration_start?: string | null;
          registration_end?: string | null;
          supports_teams?: boolean;
          max_team_size?: number | null;
          max_registrations?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_registration_forms: {
        Row: EventRegistrationForm;
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          title?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_form_fields: {
        Row: EventFormField;
        Insert: {
          id?: string;
          form_id: string;
          field_key: string;
          label: string;
          field_type: FieldType;
          options?: string[] | Record<string, any> | null;
          placeholder?: string | null;
          help_text?: string | null;
          required?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          field_key?: string;
          label?: string;
          field_type?: FieldType;
          options?: string[] | Record<string, any> | null;
          placeholder?: string | null;
          help_text?: string | null;
          required?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      event_teams: {
        Row: EventTeam;
        Insert: {
          id?: string;
          event_id: string;
          team_name: string;
          created_by_registration_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          team_name?: string;
          created_by_registration_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      event_registrations: {
        Row: EventRegistration;
        Insert: {
          id?: string;
          registration_number?: string;
          event_id: string;
          member_id?: string | null;
          registrant_name: string;
          registrant_email: string;
          registrant_phone?: string | null;
          is_member?: boolean;
          team_id?: string | null;
          status?: RegistrationStatus;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_number?: string;
          event_id?: string;
          member_id?: string | null;
          registrant_name?: string;
          registrant_email?: string;
          registrant_phone?: string | null;
          is_member?: boolean;
          team_id?: string | null;
          status?: RegistrationStatus;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      registration_answers: {
        Row: RegistrationAnswer;
        Insert: {
          id?: string;
          registration_id: string;
          field_id: string;
          answer_text?: string | null;
          answer_json?: any | null;
          file_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          field_id?: string;
          answer_text?: string | null;
          answer_json?: any | null;
          file_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      event_team_members: {
        Row: EventTeamMember;
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          uid?: string | null;
          email: string;
          member_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          uid?: string | null;
          email?: string;
          member_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contact_feedbacks: {
        Row: ContactFeedback;
        Insert: {
          id?: string;
          name: string;
          email: string;
          message: string;
          status?: FeedbackStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          message?: string;
          status?: FeedbackStatus;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      approve_membership_registration: {
        Args: { p_registration_id: string };
        Returns: void;
      };
      approve_member_application: {
        Args: { p_member_id: string };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
