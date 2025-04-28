import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';
import { Task, TeamMember } from '../../../models/task.model';
import { TaskActivity } from '../../../models/task-activity.model';
import { interval, Subscription } from 'rxjs';
import { UserRole } from '../../../models/user-role.model';

@Component({
  selector: 'app-task-activity-dialog',
  templateUrl: './task-activity-dialog.component.html',
  styleUrls: ['./task-activity-dialog.component.scss']
})
export class TaskActivityDialogComponent implements OnInit, OnDestroy {
  activities: TaskActivity[] = [];
  activityForm: FormGroup;
  isLoading = false;
  isRecording = false;
  currentActivity: TaskActivity | null = null;
  assignees: TeamMember[] = [];

  // Zaman takibi
  timer: Subscription | null = null;
  elapsedTime = 0;
  displayTime = '00:00:00';
  
  // Yetki kontrolü için değişkenler
  hasAssignPermission = false;
  allUsers: TeamMember[] = [];
  availableUsers: TeamMember[] = [];
  selectedTeamMember: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private supabaseService: SupabaseService,
    private dialogRef: MatDialogRef<TaskActivityDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: {
      task: Task;
      userId: string;
    }
  ) {
    this.activityForm = this.formBuilder.group({
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadActivities();
    this.loadAssignees();
    this.checkUserPermission();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
  
  // Kullanıcının görev atama yetkisini kontrol et
  async checkUserPermission() {
    try {
      if (!this.data.task.id || !this.data.userId) return;
      
      // Sadece görevin bağlı olduğu projenin sahibine yetki verilecek
      this.hasAssignPermission = await this.supabaseService.canManageTask(this.data.task.id, this.data.userId);
      
      // Eğer kişi atama yetkisi varsa, mevcut kullanıcıları yükle
      if (this.hasAssignPermission) {
        this.loadAllUsers();
      }
    } catch (error) {
      console.error('Yetki kontrolü yapılırken hata:', error);
      this.hasAssignPermission = false;
    }
  }
  
  // Sistemdeki tüm kullanıcıları yükle
  async loadAllUsers() {
    try {
      const { data: task } = await this.supabaseService.supabase
        .from('tasks')
        .select('project_id')
        .eq('id', this.data.task.id)
        .single();
        
      if (task) {
        // Proje detaylarını al
        const project = await this.supabaseService.getProjectById(task.project_id);
        
        // Sistemdeki tüm kullanıcıları yükle
        const { data: users, error } = await this.supabaseService.supabase
          .from('profiles')
          .select('id, full_name, username, email, avatar_url')
          .order('full_name', { ascending: true });
          
        if (error) throw error;
        this.allUsers = users || [];
        this.updateAvailableUsers();
      }
    } catch (error: any) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    }
  }
  
  // Mevcut atanmamış kullanıcıları güncelle
  updateAvailableUsers() {
    // Atanmış kişilerin ID'lerini al
    const assignedIds = this.assignees.map(assignee => assignee.id);
    
    // Henüz atanmamış kullanıcıları filtrele
    this.availableUsers = this.allUsers.filter(
      user => !assignedIds.includes(user.id)
    );
  }
  
  async loadAssignees() {
    if (!this.data.task.id) return;
    
    try {
      this.assignees = await this.supabaseService.getTaskAssignees(this.data.task.id);
      // Kullanıcı listesini güncelle
      if (this.hasAssignPermission) {
        this.updateAvailableUsers();
      }
    } catch (error: any) {
      console.error('Atanan kişiler yüklenirken hata:', error);
    }
  }
  
  // Göreve yeni kişi ata
  async addAssignee() {
    if (!this.selectedTeamMember || !this.data.task.id || !this.hasAssignPermission) return;
    
    try {
      await this.supabaseService.assignTaskToUsers(this.data.task.id, [this.selectedTeamMember]);
      
      // Atananları yeniden yükle
      await this.loadAssignees();
      
      // Seçimi temizle ve uygun üyeleri güncelle
      this.selectedTeamMember = null;
      this.updateAvailableUsers();
      
      this.snackBar.open('Kişi göreve atandı!', 'Tamam', {
        duration: 3000
      });
    } catch (error: any) {
      this.snackBar.open(error.message || 'Kişi atanırken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    }
  }
  
  // Kişiyi görevden çıkar
  async removeAssignee(userId: string) {
    if (!this.data.task.id || !this.hasAssignPermission) return;
    
    try {
      await this.supabaseService.removeTaskAssignee(this.data.task.id, userId);
      
      // Atananları yeniden yükle
      await this.loadAssignees();
      
      // Kullanıcı listesini güncelle
      this.updateAvailableUsers();
      
      this.snackBar.open('Kişi görevden çıkarıldı!', 'Tamam', {
        duration: 3000
      });
    } catch (error: any) {
      this.snackBar.open(error.message || 'Kişi çıkarılırken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    }
  }

  async loadActivities() {
    if (!this.data.task.id) return;
    
    this.isLoading = true;
    try {
      this.activities = await this.supabaseService.getTaskActivities(this.data.task.id);
    } catch (error: any) {
      this.snackBar.open(error.message || 'Aktiviteler yüklenirken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }

  startActivity() {
    if (!this.activityForm.valid) {
      this.snackBar.open('Lütfen aktivite açıklaması girin!', 'Tamam', {
        duration: 3000
      });
      return;
    }

    if (!this.data.task.id) return;
    
    this.isLoading = true;
    const startTime = new Date().toISOString();
    
    const activity: TaskActivity = {
      task_id: this.data.task.id,
      user_id: this.data.userId,
      description: this.activityForm.value.description,
      start_time: startTime
    };
    
    this.supabaseService.startTaskActivity(activity)
      .then(data => {
        this.currentActivity = data[0];
        this.isRecording = true;
        this.startTimer();
        this.snackBar.open('Aktivite başlatıldı!', 'Tamam', {
          duration: 3000
        });
      })
      .catch(error => {
        this.snackBar.open(error.message || 'Aktivite başlatılırken hata oluştu!', 'Tamam', {
          duration: 3000
        });
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  stopActivity() {
    if (!this.currentActivity?.id) return;
    
    this.isLoading = true;
    const endTime = new Date().toISOString();
    
    this.supabaseService.stopTaskActivity(this.currentActivity.id, endTime)
      .then(() => {
        this.stopTimer();
        this.isRecording = false;
        this.currentActivity = null;
        this.activityForm.reset();
        this.loadActivities();
        this.snackBar.open('Aktivite durduruldu!', 'Tamam', {
          duration: 3000
        });
      })
      .catch(error => {
        this.snackBar.open(error.message || 'Aktivite durdurulurken hata oluştu!', 'Tamam', {
          duration: 3000
        });
        
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  startTimer() {
    this.elapsedTime = 0;
    this.updateDisplayTime();
    
    this.timer = interval(1000).subscribe(() => {
      this.elapsedTime++;
      this.updateDisplayTime();
    });
  }

  stopTimer() {
    if (this.timer) {
      this.timer.unsubscribe();
      this.timer = null;
    }
  }

  updateDisplayTime() {
    const hours = Math.floor(this.elapsedTime / 3600);
    const minutes = Math.floor((this.elapsedTime % 3600) / 60);
    const seconds = this.elapsedTime % 60;
    
    this.displayTime = 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatDuration(startTime: string, endTime?: string): string {
    if (!endTime) return 'Aktif';
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    
    const seconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR');
  }
  
  formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  }
  
  getStatusText(status: string): string {
    switch (status) {
      case 'todo': return 'Yapılacak';
      case 'in_progress': return 'Devam Ediyor';
      case 'done': return 'Tamamlandı';
      default: return status;
    }
  }
  
  getPriorityText(priority: string): string {
    switch (priority) {
      case 'low': return 'Düşük';
      case 'medium': return 'Orta';
      case 'high': return 'Yüksek';
      default: return priority;
    }
  }
  
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      default: return 'inherit';
    }
  }

  close(): void {
    if (this.isRecording) {
      if (confirm('Devam eden bir aktivite var. Çıkmak istediğinize emin misiniz? Aktivite otomatik olarak durdurulacak.')) {
        this.stopActivity();
        this.dialogRef.close();
      }
    } else {
      this.dialogRef.close();
    }
  }
} 