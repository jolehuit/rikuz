export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      agents: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          instructions: string
          master_prompt: string | null
          name: string
          status: string | null
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          instructions: string
          master_prompt?: string | null
          name: string
          status?: string | null
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          instructions?: string
          master_prompt?: string | null
          name?: string
          status?: string | null
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agents_topic_id_fkey'
            columns: ['topic_id']
            isOneToOne: false
            referencedRelation: 'topics'
            referencedColumns: ['id']
          },
        ]
      }
      feed_items: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          published_at: string | null
          relevance_score: number | null
          source: string | null
          summary: string | null
          title: string
          topic_id: string
          url: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          relevance_score?: number | null
          source?: string | null
          summary?: string | null
          title: string
          topic_id: string
          url: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          relevance_score?: number | null
          source?: string | null
          summary?: string | null
          title?: string
          topic_id?: string
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'feed_items_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['agent_id']
          },
          {
            foreignKeyName: 'feed_items_topic_id_fkey'
            columns: ['topic_id']
            isOneToOne: false
            referencedRelation: 'topics'
            referencedColumns: ['id']
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          feed_item_id: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feed_item_id: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feed_item_id?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_feed_item_id_fkey'
            columns: ['feed_item_id']
            isOneToOne: false
            referencedRelation: 'feed_items'
            referencedColumns: ['id']
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          feed_item_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_item_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_item_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'saved_items_feed_item_id_fkey'
            columns: ['feed_item_id']
            isOneToOne: false
            referencedRelation: 'feed_items'
            referencedColumns: ['id']
          },
        ]
      }
      search_queue: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          results_count: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          results_count?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          results_count?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'search_queue_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['agent_id']
          },
          {
            foreignKeyName: 'search_queue_topic_id_fkey'
            columns: ['topic_id']
            isOneToOne: false
            referencedRelation: 'topics'
            referencedColumns: ['id']
          },
        ]
      }
      topics: {
        Row: {
          categorization_result: Json | null
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          master_prompt: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categorization_result?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          master_prompt?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categorization_result?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          master_prompt?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
