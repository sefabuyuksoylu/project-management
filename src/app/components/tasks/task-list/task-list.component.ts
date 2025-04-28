import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';
import { Task, TeamMember } from '../../../models/task.model';
import { Project } from '../../../models/project.model';
import { TaskFormDialogComponent } from '../task-form-dialog/task-form-dialog.component';
import { TaskActivityDialogComponent } from '../task-activity-dialog/task-activity-dialog.component';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  project: Project | null = null;
  isLoading = false;
  projectId: number | null = null;
  currentUser: any;
  teamMembers: TeamMember[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.projectId = parseInt(id);
        this.loadProject();
        this.loadTeamMembers();
      } else {
        this.router.navigate(['/dashboard']);
      }
    });

    this.supabaseService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (this.projectId && this.currentUser) {
        this.loadTasks();
      }
    });
  }

  async loadProject() {
    if (!this.projectId) return;
    
    this.isLoading = true;
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user.data.user) {
        const projects = await this.supabaseService.getProjects(user.data.user.id);
        this.project = projects.find(p => p.id === this.projectId) || null;
        
        if (!this.project) {
          this.snackBar.open('Proje bulunamadı!', 'Tamam', {
            duration: 3000
          });
          this.router.navigate(['/dashboard']);
        }
      }
    } catch (error: any) {
      this.snackBar.open(error.message || 'Proje yüklenirken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }

  async loadTasks() {
    if (!this.projectId || !this.currentUser) return;
    
    this.isLoading = true;
    try {
      this.tasks = await this.supabaseService.getTasks(this.projectId, this.currentUser.id);
    } catch (error: any) {
      this.snackBar.open(error.message || 'Görevler yüklenirken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }

  async loadTeamMembers() {
    if (!this.projectId) return;
    
    this.isLoading = true;
    try {
      this.teamMembers = await this.supabaseService.getTeamMembers(this.projectId);
    } catch (error: any) {
      this.snackBar.open(error.message || 'Takım üyeleri yüklenirken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }

  openTaskForm(task?: Task) {
    if (!this.projectId || !this.currentUser) return;
    
    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '600px',
      data: { 
        task: task || null, 
        projectId: this.projectId,
        userId: this.currentUser.id
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTasks();
      }
    });
  }

  openTaskActivities(task: Task) {
    if (!task.id) return;
    
    this.dialog.open(TaskActivityDialogComponent, {
      width: '800px',
      height: '600px',
      data: { 
        task: task,
        userId: this.currentUser?.id
      }
    });
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'todo': return 'Yapılacak';
      case 'in_progress': return 'Devam Ediyor';
      case 'done': return 'Tamamlandı';
      default: return '';
    }
  }

  async deleteTask(task: Task, event: Event) {
    event.stopPropagation();
    if (!task.id) return;
    
    if (confirm(`"${task.title}" görevini silmek istediğinize emin misiniz?`)) {
      try {
        await this.supabaseService.deleteTask(task.id);
        this.tasks = this.tasks.filter(t => t.id !== task.id);
        this.snackBar.open('Görev başarıyla silindi!', 'Tamam', {
          duration: 3000
        });
      } catch (error: any) {
        this.snackBar.open(error.message || 'Görev silinirken hata oluştu!', 'Tamam', {
          duration: 3000
        });
      }
    }
  }

  navigateBack() {
    this.router.navigate(['/dashboard']);
  }

  editProject() {
    if (!this.projectId) return;
    this.router.navigate(['/projects', this.projectId, 'edit']);
  }

  isProjectOwner(): boolean {
    return this.project && this.currentUser && this.project.user_id === this.currentUser.id;
  }
} 