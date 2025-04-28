import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';
import { Task, TeamMember } from '../../../models/task.model';

@Component({
  selector: 'app-task-form-dialog',
  templateUrl: './task-form-dialog.component.html',
  styleUrls: ['./task-form-dialog.component.scss']
})
export class TaskFormDialogComponent implements OnInit {
  taskForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  teamMembers: TeamMember[] = [];
  
  priorities = [
    { value: 'low', label: 'Düşük' },
    { value: 'medium', label: 'Orta' },
    { value: 'high', label: 'Yüksek' }
  ];
  
  statuses = [
    { value: 'todo', label: 'Yapılacak' },
    { value: 'in_progress', label: 'Devam Ediyor' },
    { value: 'done', label: 'Tamamlandı' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private supabaseService: SupabaseService,
    private dialogRef: MatDialogRef<TaskFormDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: {
      task: Task | null;
      projectId: number;
      userId: string;
    }
  ) {
    this.taskForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['todo', Validators.required],
      priority: ['medium', Validators.required],
      due_date: [null],
      assigned_to: [[]]
    });
    
    this.isEditMode = !!data.task;
    
    if (this.isEditMode && data.task) {
      this.taskForm.patchValue({
        title: data.task.title,
        description: data.task.description || '',
        status: data.task.status,
        priority: data.task.priority,
        due_date: data.task.due_date || null,
        assigned_to: data.task.assigned_to || []
      });
    }
  }

  ngOnInit(): void {
    this.loadTeamMembers();
  }
  
  async loadTeamMembers() {
    if (!this.data.projectId) return;
    
    try {
      this.isLoading = true;
      this.teamMembers = await this.supabaseService.getTeamMembers(this.data.projectId);
    } catch (error) {
      console.error('Takım üyeleri yüklenirken hata:', error);
      this.snackBar.open('Takım üyeleri yüklenemedi', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (this.taskForm.valid) {
      this.isLoading = true;
      try {
        const taskData: Task = {
          ...this.taskForm.value,
          project_id: this.data.projectId,
          user_id: this.data.userId
        };

        let result;
        if (this.isEditMode && this.data.task?.id) {
          result = await this.supabaseService.updateTask(this.data.task.id, taskData);
          this.snackBar.open('Görev başarıyla güncellendi!', 'Tamam', {
            duration: 3000
          });
        } else {
          result = await this.supabaseService.createTask(taskData);
          this.snackBar.open('Görev başarıyla oluşturuldu!', 'Tamam', {
            duration: 3000
          });
        }

        this.dialogRef.close(result);
      } catch (error: any) {
        this.snackBar.open(error.message || 'Görev kaydedilirken hata oluştu!', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
  
  isUserAssigned(userId: string): boolean {
    const assignedUsers = this.taskForm.get('assigned_to')?.value || [];
    return assignedUsers.includes(userId);
  }
  
  toggleUserAssignment(userId: string): void {
    const assignedUsers = [...(this.taskForm.get('assigned_to')?.value || [])];
    const index = assignedUsers.indexOf(userId);
    
    if (index === -1) {
      assignedUsers.push(userId);
    } else {
      assignedUsers.splice(index, 1);
    }
    
    this.taskForm.get('assigned_to')?.setValue(assignedUsers);
  }
} 