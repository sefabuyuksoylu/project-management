import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';
import { Task } from '../../../models/task.model';
import { TaskActivity } from '../../../models/task-activity.model';
import { interval, Subscription } from 'rxjs';

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

  // Zaman takibi
  timer: Subscription | null = null;
  elapsedTime = 0;
  displayTime = '00:00:00';

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
  }

  ngOnDestroy(): void {
    this.stopTimer();
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