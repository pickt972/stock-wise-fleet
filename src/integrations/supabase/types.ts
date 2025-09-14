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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          categorie: string
          created_at: string
          designation: string
          emplacement: string | null
          fournisseur_id: string | null
          id: string
          marque: string
          prix_achat: number
          reference: string
          stock: number
          stock_max: number
          stock_min: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          categorie: string
          created_at?: string
          designation: string
          emplacement?: string | null
          fournisseur_id?: string | null
          id?: string
          marque: string
          prix_achat?: number
          reference: string
          stock?: number
          stock_max?: number
          stock_min?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          categorie?: string
          created_at?: string
          designation?: string
          emplacement?: string | null
          fournisseur_id?: string | null
          id?: string
          marque?: string
          prix_achat?: number
          reference?: string
          stock?: number
          stock_max?: number
          stock_min?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      commande_items: {
        Row: {
          article_id: string | null
          commande_id: string
          created_at: string
          designation: string
          id: string
          prix_unitaire: number
          quantite_commandee: number
          quantite_recue: number
          reference: string | null
          total_ligne: number
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          commande_id: string
          created_at?: string
          designation: string
          id?: string
          prix_unitaire: number
          quantite_commandee: number
          quantite_recue?: number
          reference?: string | null
          total_ligne: number
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          commande_id?: string
          created_at?: string
          designation?: string
          id?: string
          prix_unitaire?: number
          quantite_commandee?: number
          quantite_recue?: number
          reference?: string | null
          total_ligne?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commande_items_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commande_items_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
        ]
      }
      commandes: {
        Row: {
          adresse_fournisseur: string | null
          created_at: string
          date_creation: string
          date_envoi: string | null
          date_reception_prevue: string | null
          date_reception_reelle: string | null
          email_fournisseur: string | null
          fournisseur: string
          id: string
          notes: string | null
          numero_commande: string
          status: Database["public"]["Enums"]["commande_status"]
          telephone_fournisseur: string | null
          total_ht: number
          total_ttc: number
          tva_taux: number
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse_fournisseur?: string | null
          created_at?: string
          date_creation?: string
          date_envoi?: string | null
          date_reception_prevue?: string | null
          date_reception_reelle?: string | null
          email_fournisseur?: string | null
          fournisseur: string
          id?: string
          notes?: string | null
          numero_commande: string
          status?: Database["public"]["Enums"]["commande_status"]
          telephone_fournisseur?: string | null
          total_ht?: number
          total_ttc?: number
          tva_taux?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse_fournisseur?: string | null
          created_at?: string
          date_creation?: string
          date_envoi?: string | null
          date_reception_prevue?: string | null
          date_reception_reelle?: string | null
          email_fournisseur?: string | null
          fournisseur?: string
          id?: string
          notes?: string | null
          numero_commande?: string
          status?: Database["public"]["Enums"]["commande_status"]
          telephone_fournisseur?: string | null
          total_ht?: number
          total_ttc?: number
          tva_taux?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fournisseurs: {
        Row: {
          actif: boolean
          adresse: string | null
          contact_principal: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          notes: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          contact_principal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          contact_principal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          last_name: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          article_id: string
          created_at: string
          id: string
          motif: string
          quantity: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          motif: string
          quantity: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          motif?: string
          quantity?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_user_id_by_email: {
        Args: { _email: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_article_stock: {
        Args: { article_id: string; quantity_change: number }
        Returns: undefined
      }
      update_commande_totals: {
        Args: { commande_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "magasinier" | "chef_agence"
      commande_status:
        | "brouillon"
        | "envoye"
        | "confirme"
        | "recu_partiel"
        | "recu_complet"
        | "annule"
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
      app_role: ["admin", "magasinier", "chef_agence"],
      commande_status: [
        "brouillon",
        "envoye",
        "confirme",
        "recu_partiel",
        "recu_complet",
        "annule",
      ],
    },
  },
} as const
