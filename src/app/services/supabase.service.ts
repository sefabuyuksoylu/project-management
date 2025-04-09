import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUser.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.loadUser();
  }

  // Kullanıcı verilerini yükler
  private async loadUser() {
    const { data } = await this.supabase.auth.getUser();
    this.currentUser.next(data.user);
  }

  // Kullanıcı kaydı
  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Kullanıcı girişi
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    this.currentUser.next(data.user);
    return data;
  }

  // Kullanıcı çıkışı
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.currentUser.next(null);
  }

  // Kullanıcı bilgilerini günceller
  getCurrentUser() {
    return this.supabase.auth.getUser();
  }

  // Projeler
  async getProjects(userId: string) {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  async createProject(project: any) {
    const { data, error } = await this.supabase
      .from('projects')
      .insert(project)
      .select();
    if (error) throw error;
    return data;
  }

  async updateProject(id: number, project: any) {
    const { data, error } = await this.supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  }

  async deleteProject(id: number) {
    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Görevler
  async getTasks(projectId: number) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw error;
    return data;
  }

  async createTask(task: any) {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert(task)
      .select();
    if (error) throw error;
    return data;
  }

  async updateTask(id: number, task: any) {
    const { data, error } = await this.supabase
      .from('tasks')
      .update(task)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  }

  async deleteTask(id: number) {
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Görev aktiviteleri
  async getTaskActivities(taskId: number) {
    const { data, error } = await this.supabase
      .from('task_activities')
      .select('*')
      .eq('task_id', taskId)
      .order('start_time', { ascending: false });
    if (error) throw error;
    return data;
  }

  async startTaskActivity(activity: any) {
    const { data, error } = await this.supabase
      .from('task_activities')
      .insert(activity)
      .select();
    if (error) throw error;
    return data;
  }

  async stopTaskActivity(id: number, endTime: string) {
    const { data, error } = await this.supabase
      .from('task_activities')
      .update({ end_time: endTime })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  }

  async updateTaskActivity(id: number, activity: any) {
    const { data, error } = await this.supabase
      .from('task_activities')
      .update(activity)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  }
} 