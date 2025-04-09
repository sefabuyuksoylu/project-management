export interface TaskActivity {
  id?: number;
  task_id: number;
  user_id: string;
  description?: string;
  start_time: string; // ISO date string
  end_time?: string;  // ISO date string
  duration?: number;  // saniye cinsinden süre
  created_at?: Date;
} 