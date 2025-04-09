export interface Project {
  id?: number;
  name: string;
  description: string;
  user_id: string;
  created_at?: Date;
  status?: 'active' | 'completed' | 'archived';
} 