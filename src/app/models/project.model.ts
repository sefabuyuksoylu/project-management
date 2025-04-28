import { TeamMember } from './task.model';

export interface Project {
  id?: number;
  name: string;
  description: string;
  user_id: string;
  created_at?: Date;
  updated_at?: Date;
  deadline?: Date;
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'archived';
  team_members?: string[]; // Proje takım üyelerinin kullanıcı ID'leri
  
  // UI için genişletilmiş özellikler
  startDate?: Date;
  endDate?: Date;
  teamSize?: number;
  taskCount?: number;
  teamMembers?: TeamMember[]; // Takım üyelerinin detayları
} 