export interface Notification {
  id: string;
  message: string;
  time: Date;
  read: boolean;
  icon?: string;
  link?: string;
  type?: 'task' | 'project' | 'team' | 'system';
} 