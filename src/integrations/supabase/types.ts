export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      absensi: {
        Row: {
          alasan: string | null
          approved_by: string | null
          clock_out_location: string | null
          clock_out_security_data: Json | null
          clock_out_time: string | null
          created_at: string | null
          device_fingerprint: string | null
          id: string
          is_clocked_out: boolean | null
          lokasi: string | null
          metode: Database["public"]["Enums"]["attendance_method"]
          photo_url: string | null
          risk_level: string | null
          security_data: Json | null
          shift_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
          waktu: string
        }
        Insert: {
          alasan?: string | null
          approved_by?: string | null
          clock_out_location?: string | null
          clock_out_security_data?: Json | null
          clock_out_time?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          is_clocked_out?: boolean | null
          lokasi?: string | null
          metode?: Database["public"]["Enums"]["attendance_method"]
          photo_url?: string | null
          risk_level?: string | null
          security_data?: Json | null
          shift_id?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
          waktu?: string
        }
        Update: {
          alasan?: string | null
          approved_by?: string | null
          clock_out_location?: string | null
          clock_out_security_data?: Json | null
          clock_out_time?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          is_clocked_out?: boolean | null
          lokasi?: string | null
          metode?: Database["public"]["Enums"]["attendance_method"]
          photo_url?: string | null
          risk_level?: string | null
          security_data?: Json | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id?: string
          waktu?: string
        }
        Relationships: [
          {
            foreignKeyName: "absensi_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absensi_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absensi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lokasi_valid: {
        Row: {
          aktif: boolean
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          nama_lokasi: string
          radius_meter: number
        }
        Insert: {
          aktif?: boolean
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          nama_lokasi: string
          radius_meter?: number
        }
        Update: {
          aktif?: boolean
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          nama_lokasi?: string
          radius_meter?: number
        }
        Relationships: []
      }
      makeup_requests: {
        Row: {
          admin_notes: string | null
          alasan: string
          approved_by: string | null
          bukti_url: string | null
          created_at: string | null
          id: string
          status: Database["public"]["Enums"]["request_status"]
          tanggal_absen: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          alasan: string
          approved_by?: string | null
          bukti_url?: string | null
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          tanggal_absen: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          alasan?: string
          approved_by?: string | null
          bukti_url?: string | null
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          tanggal_absen?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "makeup_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      shift: {
        Row: {
          aktif: boolean
          created_at: string | null
          id: string
          jam_keluar: string
          jam_masuk: string
          jenis_hari: string
          nama_shift: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string | null
          id?: string
          jam_keluar: string
          jam_masuk: string
          jenis_hari?: string
          nama_shift: string
        }
        Update: {
          aktif?: boolean
          created_at?: string | null
          id?: string
          jam_keluar?: string
          jam_masuk?: string
          jenis_hari?: string
          nama_shift?: string
        }
        Relationships: []
      }
      user_shifts: {
        Row: {
          created_at: string | null
          id: string
          shift_id: string
          tanggal: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shift_id: string
          tanggal: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shift_id?: string
          tanggal?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shifts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      attendance_method: "absen" | "make-up"
      attendance_status: "HADIR" | "TERLAMBAT" | "MAKE_UP"
      request_status: "pending" | "approved" | "rejected"
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_method: ["absen", "make-up"],
      attendance_status: ["HADIR", "TERLAMBAT", "MAKE_UP"],
      request_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "user"],
    },
  },
} as const