export interface Task {
  id?: number;
  title: string;
  description?: string;
  project_id: number;
  user_id: string; // Görevi oluşturan kullanıcı
  assigned_to?: string[]; // Görevin atandığı kişilerin kullanıcı ID'leri
  assignee_details?: TeamMember[]; // Atanan kişilerin detaylı bilgileri
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  created_at?: Date;
  updated_at?: Date;
  completed_at?: Date;
}

export interface TeamMember {
  id: string;
  full_name?: string;
  username?: string;
  email: string;
  avatar_url?: string;
} 