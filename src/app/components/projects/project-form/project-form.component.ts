import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';
import { Project } from '../../../models/project.model';
import { TeamMember } from '../../../models/task.model';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  projectForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  projectId: number | null = null;
  projectStatuses = [
    { value: 'in-progress', label: 'Aktif' },
    { value: 'completed', label: 'Tamamlandı' },
    { value: 'archived', label: 'Arşivlendi' }
  ];
  allUsers: TeamMember[] = [];
  teamMembers: TeamMember[] = [];
  currentProjectMembers: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.projectForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      status: ['in-progress', Validators.required],
      teamSize: [1, [Validators.required, Validators.min(1), Validators.max(50)]]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id && id !== 'new') {
      this.isEditMode = true;
      this.projectId = parseInt(id);
      this.loadProject(this.projectId);
    }
    
    // Tüm kullanıcıları yükle
    this.loadAllUsers();
  }

  async loadAllUsers() {
    try {
      this.isLoading = true;
      this.allUsers = await this.supabaseService.getAllUsers();
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      this.snackBar.open('Kullanıcılar yüklenemedi', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }

  async loadProject(id: number) {
    this.isLoading = true;
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user.data.user) {
        const projects = await this.supabaseService.getProjects(user.data.user.id);
        const project = projects.find(p => p.id === id);
        
        if (project) {
          let status = project.status;
          if (status === 'active') {
            status = 'in-progress';
          }
          
          this.projectForm.patchValue({
            name: project.name,
            description: project.description,
            status: status,
            teamSize: project.team_size || 1
          });
          
          // Takım üyelerini kaydet
          if (project.team_members) {
            this.currentProjectMembers = project.team_members;
          }
          
          // Proje takım üyelerini yükle
          await this.loadTeamMembers(id);
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
  
  async loadTeamMembers(projectId: number) {
    try {
      this.teamMembers = await this.supabaseService.getTeamMembers(projectId);
    } catch (error) {
      console.error('Takım üyeleri yüklenirken hata:', error);
      this.snackBar.open('Takım üyeleri yüklenemedi', 'Tamam', {
        duration: 3000
      });
    }
  }

  async onSubmit() {
    if (this.projectForm.valid) {
      this.isLoading = true;
      try {
        const user = await this.supabaseService.getCurrentUser();
        if (user.data.user) {
          const projectData: Project = {
            ...this.projectForm.value,
            user_id: user.data.user.id,
            team_members: this.currentProjectMembers.length > 0 ? this.currentProjectMembers : [user.data.user.id]
          };

          if (this.isEditMode && this.projectId) {
            await this.supabaseService.updateProject(this.projectId, projectData);
            this.snackBar.open('Proje başarıyla güncellendi!', 'Tamam', {
              duration: 3000
            });
          } else {
            await this.supabaseService.createProject(projectData);
            this.snackBar.open('Proje başarıyla oluşturuldu!', 'Tamam', {
              duration: 3000
            });
          }
          this.router.navigate(['/dashboard']);
        }
      } catch (error: any) {
        this.snackBar.open(error.message || 'Proje kaydedilirken hata oluştu!', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
  
  // Projeyi silme işlemi
  async deleteProject() {
    if (!this.projectId) return;
    
    if (confirm(`Bu projeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      this.isLoading = true;
      try {
        await this.supabaseService.deleteProject(this.projectId);
        this.snackBar.open('Proje başarıyla silindi!', 'Tamam', {
          duration: 3000
        });
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.snackBar.open(error.message || 'Proje silinirken hata oluştu!', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  // Kullanıcı projeye atanmış mı kontrol et
  isUserAssigned(userId: string): boolean {
    return this.currentProjectMembers.includes(userId);
  }
  
  // Kullanıcıyı projeye ekle veya çıkar
  toggleUserAssignment(userId: string): void {
    const index = this.currentProjectMembers.indexOf(userId);
    
    if (index === -1) {
      this.currentProjectMembers.push(userId);
    } else {
      this.currentProjectMembers.splice(index, 1);
    }
  }
  
  // Kullanıcıyı projeden çıkar
  async removeTeamMember(userId: string) {
    if (!this.projectId) return;
    
    try {
      this.isLoading = true;
      await this.supabaseService.removeUserFromProject(this.projectId, userId);
      
      // Listeden kaldır
      this.teamMembers = this.teamMembers.filter(member => member.id !== userId);
      const index = this.currentProjectMembers.indexOf(userId);
      if (index !== -1) {
        this.currentProjectMembers.splice(index, 1);
      }
      
      this.snackBar.open('Kullanıcı projeden çıkarıldı', 'Tamam', {
        duration: 3000
      });
    } catch (error: any) {
      this.snackBar.open(error.message || 'Kullanıcı çıkarılırken hata oluştu', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }
  
  // Yeni kullanıcı ekle
  async addTeamMember(userId: string) {
    if (!this.projectId || !userId) return;
    
    try {
      this.isLoading = true;
      await this.supabaseService.assignUserToProject(this.projectId, userId);
      
      // Güncel takım üyelerini yeniden yükle
      await this.loadTeamMembers(this.projectId);
      
      // Atanan kullanıcıları güncelle
      if (!this.currentProjectMembers.includes(userId)) {
        this.currentProjectMembers.push(userId);
      }
      
      this.snackBar.open('Kullanıcı projeye eklendi', 'Tamam', {
        duration: 3000
      });
    } catch (error: any) {
      this.snackBar.open(error.message || 'Kullanıcı eklenirken hata oluştu', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }
} 