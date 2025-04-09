import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Project } from '../../models/project.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  projects: Project[] = [];
  isLoading = false;
  currentUser: any;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadProjects();
    this.supabaseService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  async loadProjects() {
    this.isLoading = true;
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user.data.user) {
        const projects = await this.supabaseService.getProjects(user.data.user.id);
        this.projects = projects;
      }
    } catch (error: any) {
      this.snackBar.open(error.message || 'Projeler yüklenirken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }

  openProjectDetails(project: Project) {
    this.router.navigate(['/projects', project.id]);
  }

  async signOut() {
    try {
      await this.supabaseService.signOut();
      this.router.navigate(['/login']);
    } catch (error: any) {
      this.snackBar.open(error.message || 'Çıkış yapılırken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    }
  }
} 