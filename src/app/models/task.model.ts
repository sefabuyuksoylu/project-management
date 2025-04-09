export interface Task {
  id?: number;
  title: string;
  description?: string;
  project_id: number;
  user_id: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  created_at?: Date;
} 