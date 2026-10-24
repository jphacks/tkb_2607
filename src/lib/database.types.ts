export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      ble_tokens: {
        Row: {
          token: string;
          user_id: string;
          valid_from: string;
          valid_until: string;
        };
        Insert: {
          token: string;
          user_id: string;
          valid_from: string;
          valid_until: string;
        };
        Update: {
          token?: string;
          user_id?: string;
          valid_from?: string;
          valid_until?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ble_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      encounters: {
        Row: {
          detected_at: string;
          id: number;
          reported_by: string | null;
          rssi: number | null;
          user_a: string;
          user_b: string;
        };
        Insert: {
          detected_at: string;
          id?: never;
          reported_by?: string | null;
          rssi?: number | null;
          user_a: string;
          user_b: string;
        };
        Update: {
          detected_at?: string;
          id?: never;
          reported_by?: string | null;
          rssi?: number | null;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'encounters_reported_by_fkey';
            columns: ['reported_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encounters_user_a_fkey';
            columns: ['user_a'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encounters_user_b_fkey';
            columns: ['user_b'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      home_lineups: {
        Row: {
          angles: Json | null;
          created_at: string;
          member_ids: string[];
          period_start: string;
          user_id: string;
        };
        Insert: {
          angles?: Json | null;
          created_at?: string;
          member_ids: string[];
          period_start: string;
          user_id: string;
        };
        Update: {
          angles?: Json | null;
          created_at?: string;
          member_ids?: string[];
          period_start?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'home_lineups_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      planets: {
        Row: {
          image_path: string | null;
          palette: Json;
          source_photo_path: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          image_path?: string | null;
          palette?: Json;
          source_photo_path?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          image_path?: string | null;
          palette?: Json;
          source_photo_path?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'planets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      private_profiles: {
        Row: {
          real_name: string | null;
          user_id: string;
        };
        Insert: {
          real_name?: string | null;
          user_id: string;
        };
        Update: {
          real_name?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'private_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          is_dummy: boolean;
          nickname: string;
          sound_path: string | null;
        };
        Insert: {
          created_at?: string;
          id: string;
          is_dummy?: boolean;
          nickname?: string;
          sound_path?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_dummy?: boolean;
          nickname?: string;
          sound_path?: string | null;
        };
        Relationships: [];
      };
      satellites: {
        Row: {
          created_at: string;
          id: string;
          image_path: string;
          is_featured: boolean;
          sort_order: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_path: string;
          is_featured?: boolean;
          sort_order?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_path?: string;
          is_featured?: boolean;
          sort_order?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'satellites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: never;
          name: string;
        };
        Update: {
          id?: never;
          name?: string;
        };
        Relationships: [];
      };
      user_tags: {
        Row: {
          tag_id: number;
          user_id: string;
        };
        Insert: {
          tag_id: number;
          user_id: string;
        };
        Update: {
          tag_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_tags_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      demo_add_encounter: {
        Args: { p_target_user_id: string };
        Returns: undefined;
      };
      demo_reset_home_lineup: { Args: never; Returns: undefined };
      get_home_candidates: {
        Args: { p_limit?: number };
        Returns: {
          angle: number;
          encounter_count: number;
          encounter_timestamps: string[];
          featured_satellites: Json;
          last_encounter_at: string;
          lineup_period_start: string;
          nickname: string;
          palette: Json;
          planet_image_path: string;
          shared_tag_count: number;
          tag_union_count: number;
          user_id: string;
        }[];
      };
      home_period_start: { Args: never; Returns: string };
      issue_ble_token: {
        Args: never;
        Returns: {
          token: string;
          valid_until: string;
        }[];
      };
      report_encounter: {
        Args: { p_detected_at: string; p_rssi: number; p_token: string };
        Returns: Json;
      };
      save_home_angles: {
        Args: { p_angles: Json; p_period_start: string };
        Returns: boolean;
      };
      set_my_tags: { Args: { p_names: string[] }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
