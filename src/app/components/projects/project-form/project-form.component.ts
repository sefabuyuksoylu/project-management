import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';
import { Project } from '../../../models/project.model';

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
    { value: 'active', label: 'Aktif' },
    { value: 'completed', label: 'Tamamlandı' },
    { value: 'archived', label: 'Arşivlendi' }
  ];

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
      status: ['active', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id && id !== 'new') {
      this.isEditMode = true;
      this.projectId = parseInt(id);
      this.loadProject(this.projectId);
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
          this.projectForm.patchValue({
            name: project.name,
            description: project.description,
            status: project.status
          });
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

  async onSubmit() {
    if (this.projectForm.valid) {
      this.isLoading = true;
      try {
        const user = await this.supabaseService.getCurrentUser();
        if (user.data.user) {
          const projectData: Project = {
            ...this.projectForm.value,
            user_id: user.data.user.id
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
} 