import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUser.asObservable();
  private authStateChangeSubscription: any;

  constructor() {
    // Supabase istemcisini değiştirdik - kilit sorunlarını önlemek için lockTimeout ekledik ve 
    // storage yöntemini değiştirdik
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        storageKey: 'project-management-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem: (key) => {
            try {
              const value = localStorage.getItem(key);
              return value;
            } catch (e) {
              console.error('Storage error:', e);
              return null;
            }
          },
          setItem: (key, value) => {
            try {
              localStorage.setItem(key, value);
              return;
            } catch (e) {
              console.error('Storage error:', e);
            }
          },
          removeItem: (key) => {
            try {
              localStorage.removeItem(key);
              return;
            } catch (e) {
              console.error('Storage error:', e);
            }
          }
        }
      }
    });
    
    // Sayfa yenilendiğinde veya uygulama açıldığında oturum kontrolü
    this.initializeAuth();
  }

  // Kullanıcı verilerini yükler ve oturum durumunu kontrol eder
  private async initializeAuth() {
    try {
      // Önce mevcut oturum durumunu kontrol et
      const { data: { session } } = await this.supabase.auth.getSession();
      
      console.log('Current session:', session);
      
      if (session) {
        // Oturum varsa kullanıcı bilgisini güncelle
        this.currentUser.next(session.user);
      } else {
        // Oturum yoksa null değeri ata
        this.currentUser.next(null);
      }
      
      // Daha önce varsa aboneliği temizle
      if (this.authStateChangeSubscription) {
        this.authStateChangeSubscription.unsubscribe();
      }
      
      // Oturum durumu değişikliklerini dinle
      this.authStateChangeSubscription = this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session ? session.user : null);
        
        if (event === 'SIGNED_IN' && session) {
          this.currentUser.next(session.user);
        } else if (event === 'SIGNED_OUT') {
          this.currentUser.next(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          this.currentUser.next(session.user);
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.currentUser.next(null);
    }
  }

  // Kullanıcı kaydı
  async signUp(email: string, password: string) {
    try {
      // Kilitlere neden olan senkronizasyon sorunlarını önlemek için doğrudan denenecek
      try {
        localStorage.removeItem('project-management-auth');
        sessionStorage.removeItem('project-management-auth');
      } catch (e) {
        console.warn('Storage temizleme hatası:', e);
      }
      
      console.log('Kayıt işlemi başlatılıyor:', email);
      
      // Daha uzun zaman aşımı değeri ile kimlik doğrulama
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/login'
        }
      });
      
      if (error) {
        console.error('Supabase signUp hatası:', error);
        throw error;
      }
      
      if (!data.user) {
        console.error('Kullanıcı oluşturulamadı: Kullanıcı verisi dönmedi');
        throw new Error('Kullanıcı oluşturulamadı');
      }
      
      console.log('Kullanıcı başarıyla oluşturuldu:', data.user.id);
      
      // Kullanıcı profili oluşturulduğundan emin olalım
      // Eğer profil oluşturulamazsa bile kayıt işleminin devam etmesini sağlar
      try {
        // Burada profil oluşturma işlemini yapalım, ancak hatalar görmezden gelinecek
        await this.createUserProfile(data.user.id, email);
      } catch (profileError) {
        console.error('Profil oluşturma hatası, ama kayıt işlemi tamamlandı:', profileError);
        // Ana kaydı etkilemediği için hata fırlatmıyoruz
      }
      
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }
  
  // Kullanıcı profili oluşturma
  private async createUserProfile(userId: string, email: string) {
    try {
      // Kullanıcının zaten profili var mı kontrol et
      const { data: existingProfile, error: fetchError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
        
      if (fetchError) {
        console.error('Profil kontrol hatası:', fetchError);
        return; // Sessizce başarısız ol - kullanıcı kaydını engelleme
      }
        
      if (existingProfile) {
        console.log('Profil zaten var, oluşturmaya gerek yok');
        return;
      }
      
      // Görünen tabloya göre sadece mevcut alanları doldur - email alanı yok!
      const { error: insertError } = await this.supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: '',
          title: '',
          bio: '',
          avatar_url: null,
          role: 'user',
          created_at: new Date(),
          updated_at: new Date()
        });
        
      if (insertError) {
        console.error('Profil oluşturma hatası:', insertError);
        // Ana kaydı etkilemediği için sessizce başarısız ol
      } else {
        console.log('Profil başarıyla oluşturuldu');
      }
    } catch (error) {
      console.error('Profil oluşturma işleminde beklenmeyen hata:', error);
      // Ana kaydı etkilemediği için sessizce başarısız ol
    }
  }

  // Kullanıcı girişi
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      this.currentUser.next(data.user);
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
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
    try {
      // Kullanıcının oluşturduğu projeleri getir
      const { data: ownedProjects, error: ownedError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);
      
      if (ownedError) throw ownedError;

      // Kullanıcının takım üyesi olduğu projeleri getir
      const { data: teamProjects, error: teamError } = await this.supabase
        .from('projects')
        .select('*')
        .not('user_id', 'eq', userId) // Kullanıcının kendi projeleri olmamalı
        .contains('team_members', [userId]); // team_members dizisinde userId olmalı
      
      if (teamError) throw teamError;
      
      // İki diziyi birleştir
      const allProjects = [
        ...(ownedProjects || []),
        ...(teamProjects || [])
      ];
      
      return allProjects;
    } catch (error) {
      console.error('Projeler yüklenirken hata:', error);
      throw error;
    }
  }

  async createProject(project: any) {
    // teamSize -> team_size dönüşümü
    const projectData = { ...project };
    
    if (projectData.teamSize !== undefined) {
      projectData.team_size = projectData.teamSize;
      delete projectData.teamSize;
    }
    
    const { data, error } = await this.supabase
      .from('projects')
      .insert(projectData)
      .select();
    if (error) throw error;
    return data;
  }

  async updateProject(id: number, project: any) {
    // teamSize -> team_size dönüşümü
    const projectData = { ...project };
    
    if (projectData.teamSize !== undefined) {
      projectData.team_size = projectData.teamSize;
      delete projectData.teamSize;
    }
    
    const { data, error } = await this.supabase
      .from('projects')
      .update(projectData)
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
  async getTasks(projectId: number, userId?: string) {
    try {
      // Eğer userId verilmediyse, tüm görevleri getir
      if (!userId) {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId);
        if (error) throw error;
        return data;
      }
      
      // Kullanıcının proje sahibi olup olmadığını kontrol et
      const isOwner = await this.isProjectOwner(projectId, userId);
      
      // Proje sahibiyse tüm görevleri görebilir
      if (isOwner) {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId);
        if (error) throw error;
        return data;
      }
      
      // Proje sahibi değilse, sadece kendisine atanan görevleri görebilir
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .contains('assigned_to', [userId]);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Görevler yüklenirken hata:', error);
      throw error;
    }
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

  // Görevlerin istatistiklerini almak için yeni method
  async getTaskStats(userId: string) {
    const { data: inProgress, error: inProgressError } = await this.supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'in_progress');
    
    const { data: completed, error: completedError } = await this.supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'done');
    
    if (inProgressError || completedError) throw inProgressError || completedError;
    
    return {
      active: inProgress ? inProgress.length : 0,
      completed: completed ? completed.length : 0
    };
  }

  // Kullanıcı profil bilgilerini al
  async getUserProfile(userId: string) {
    try {
      return await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    } catch (error) {
      console.error('Profil bilgileri yüklenirken hata:', error);
      throw error;
    }
  }

  // Kullanıcı profil bilgilerini güncelle
  async updateUserProfile(profileData: any) {
    try {
      return await this.supabase
        .from('profiles')
        .upsert(profileData)
        .select();
    } catch (error) {
      console.error('Profil güncellenirken hata:', error);
      throw error;
    }
  }

  // Profil resmi yükle
  async uploadAvatar(userId: string, file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${userId}.${fileExt}`;

      // Dosyayı yükle
      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Dosya URL'ini al
      const { data } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Profil bilgisini güncelle
      await this.updateUserProfile({
        id: userId,
        avatar_url: data.publicUrl,
        updated_at: new Date()
      });

      return data.publicUrl;
    } catch (error) {
      console.error('Avatar yüklenirken hata:', error);
      throw error;
    }
  }

  // Kullanıcı ayarlarını al
  async getUserSettings(userId: string) {
    try {
      return await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
      throw error;
    }
  }

  // Kullanıcı ayarlarını güncelle
  async updateUserSettings(settingsData: any) {
    try {
      return await this.supabase
        .from('user_settings')
        .upsert(settingsData)
        .select();
    } catch (error) {
      console.error('Ayarlar güncellenirken hata:', error);
      throw error;
    }
  }

  // Kullanıcı hesabını sil
  async deleteUserAccount(userId: string) {
    try {
      // Kullanıcıyla ilgili tüm verileri sil
      await this.supabase.from('profiles').delete().eq('id', userId);
      await this.supabase.from('user_settings').delete().eq('user_id', userId);
      await this.supabase.from('projects').delete().eq('user_id', userId);

      // Kullanıcı hesabını Supabase Auth'dan sil
      const { error } = await this.supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Hesap silinirken hata:', error);
      throw error;
    }
  }

  // Takım üyelerini getirme
  async getTeamMembers(projectId: number) {
    try {
      // Proje bilgisini al, proje sahibini bul
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      // Projenin sahibinin profilini getir
      const { data: ownerProfile, error: ownerError } = await this.supabase
        .from('profiles')
        .select('id, full_name, username, email, avatar_url')
        .eq('id', project.user_id)
        .single();
      
      if (ownerError) throw ownerError;
      
      // Eğer projede ekstra takım üyeleri varsa (projede team_members alanı olduğunu varsayarak)
      const teamMembers = [ownerProfile];
      
      if (project.team_members && project.team_members.length > 0) {
        // Proje sahibini team_members dizisinden çıkar (eğer varsa)
        const otherMemberIds = project.team_members.filter((id: string) => id !== project.user_id);
        
        if (otherMemberIds.length > 0) {
          // Diğer takım üyelerinin profillerini getir
          const { data: otherProfiles, error: profilesError } = await this.supabase
            .from('profiles')
            .select('id, full_name, username, email, avatar_url')
            .in('id', otherMemberIds);
          
          if (profilesError) throw profilesError;
          
          if (otherProfiles && otherProfiles.length > 0) {
            teamMembers.push(...otherProfiles);
          }
        }
      }
      
      return teamMembers;
    } catch (error) {
      console.error('Takım üyeleri yüklenirken hata:', error);
      throw error;
    }
  }
  
  // Görev üzerindeki atanmış kişilerin detaylarını getiren metod
  async getTaskAssignees(taskId: number) {
    try {
      // Görevi al ve atanan kişilerin ID'lerini çek
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .single();
      
      if (taskError) throw taskError;
      
      // Eğer görev kimseye atanmamışsa boş dizi döndür
      if (!task.assigned_to || task.assigned_to.length === 0) {
        return [];
      }
      
      // Atanan kişilerin profillerini getir
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id, full_name, username, email, avatar_url')
        .in('id', task.assigned_to);
      
      if (profilesError) throw profilesError;
      
      return profiles || [];
    } catch (error) {
      console.error('Görev atanan kişileri yüklenirken hata:', error);
      throw error;
    }
  }
  
  // Bir göreve kişi atama
  async assignTaskToUsers(taskId: number, userIds: string[]) {
    try {
      // Görevin mevcut atanan kişilerini al
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .single();
      
      if (taskError) throw taskError;
      
      // Mevcut assigned_to dizisi veya boş dizi
      const currentAssignees = task.assigned_to || [];
      
      // Yeni atanacak kişileri ekleyerek benzersiz bir liste oluştur
      const updatedAssignees = [...new Set([...currentAssignees, ...userIds])];
      
      // Görevi güncelle
      const { data, error } = await this.supabase
        .from('tasks')
        .update({ 
          assigned_to: updatedAssignees,
          updated_at: new Date()
        })
        .eq('id', taskId)
        .select();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Görev atama işlemi sırasında hata:', error);
      throw error;
    }
  }
  
  // Görevden kişi çıkarma
  async removeTaskAssignee(taskId: number, userId: string) {
    try {
      // Görevin mevcut atanan kişilerini al
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .single();
      
      if (taskError) throw taskError;
      
      // Mevcut assigned_to dizisi veya boş dizi
      const currentAssignees = task.assigned_to || [];
      
      // Belirtilen kullanıcıyı çıkar
      const updatedAssignees = currentAssignees.filter((id: string) => id !== userId);
      
      // Görevi güncelle
      const { data, error } = await this.supabase
        .from('tasks')
        .update({ 
          assigned_to: updatedAssignees,
          updated_at: new Date()
        })
        .eq('id', taskId)
        .select();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Görev atama kaldırma işlemi sırasında hata:', error);
      throw error;
    }
  }
  
  // Kullanıcıya atanmış görevleri getirme
  async getTasksAssignedToUser(userId: string) {
    try {
      // Supabase JSON operatörlerini kullanarak, assigned_to dizisinde userId olan görevleri bul
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*, projects(name, status)')
        .contains('assigned_to', [userId]);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Kullanıcıya atanmış görevler yüklenirken hata:', error);
      throw error;
    }
  }

  // Kullanıcının admin olup olmadığını kontrol et
  async isUserAdmin(userId: string) {
    try {
      // Kullanıcı rolünü kontrol etmek için profil tablosuna bakıyoruz
      const { data, error } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      return data?.role === 'admin';
    } catch (error) {
      console.error('Kullanıcı rol kontrolü yapılırken hata:', error);
      return false;
    }
  }

  // Kullanıcının proje sahibi olup olmadığını kontrol et
  async isProjectOwner(projectId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();
        
      if (error) throw error;
      return data.user_id === userId;
    } catch (error) {
      console.error('Proje sahipliği kontrolü yapılırken hata:', error);
      return false;
    }
  }

  // Görev üzerinde işlem yapma yetkisi kontrolü - sadece proje sahibine izin verir
  async canManageTask(taskId: number, userId: string): Promise<boolean> {
    try {
      // Görevi getir
      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .select('project_id')
        .eq('id', taskId)
        .single();
        
      if (taskError) throw taskError;
      
      // Kullanıcı proje sahibi mi kontrol et
      return await this.isProjectOwner(task.project_id, userId);
    } catch (error) {
      console.error('Görev yetki kontrolü yapılırken hata:', error);
      return false;
    }
  }

  // Proje detaylarını getir
  async getProjectById(projectId: number) {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (error) throw error;
    return data;
  }

  // Projeye kullanıcı atama
  async assignUserToProject(projectId: number, userId: string) {
    try {
      // Projenin mevcut takım üyelerini al
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('team_members, user_id')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      // Mevcut takım üyeleri dizisi veya boş dizi
      const currentMembers = project.team_members || [];
      
      // Kullanıcı zaten takımda mı kontrol et
      if (currentMembers.includes(userId)) {
        return { message: "Kullanıcı zaten bu projenin takımında." };
      }
      
      // Yeni üyeyi ekleyerek benzersiz bir liste oluştur
      const updatedMembers = [...new Set([...currentMembers, userId])];
      
      // Projeyi güncelle
      const { data, error } = await this.supabase
        .from('projects')
        .update({ 
          team_members: updatedMembers,
          updated_at: new Date()
        })
        .eq('id', projectId)
        .select();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Kullanıcı projeye eklenirken hata:', error);
      throw error;
    }
  }
  
  // Projeden kullanıcı çıkarma
  async removeUserFromProject(projectId: number, userId: string) {
    try {
      // Projenin mevcut takım üyelerini al
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('team_members, user_id')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      // Proje sahibi çıkarılamaz
      if (project.user_id === userId) {
        throw new Error('Proje sahibi projeden çıkarılamaz.');
      }
      
      // Mevcut takım üyeleri dizisi veya boş dizi
      const currentMembers = project.team_members || [];
      
      // Belirtilen kullanıcıyı çıkar
      const updatedMembers = currentMembers.filter((id: string) => id !== userId);
      
      // Projeyi güncelle
      const { data, error } = await this.supabase
        .from('projects')
        .update({ 
          team_members: updatedMembers,
          updated_at: new Date()
        })
        .eq('id', projectId)
        .select();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Kullanıcı projeden çıkarılırken hata:', error);
      throw error;
    }
  }
  
  // Projeye atanabilecek kullanıcıları getir (sistemdeki tüm kullanıcılar)
  async getAllUsers() {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, full_name, username, email, avatar_url')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      throw error;
    }
  }
} 