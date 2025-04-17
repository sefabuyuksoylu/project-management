import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { Project } from '../../models/project.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  isLoading = false;
  currentUser: any;
  isDarkMode$: Observable<boolean>;

  // Arama ve filtreleme için değişkenler
  searchTerm: string = '';
  statusFilter: string = 'all';
  sortBy: string = 'newest';

  // İstatistikler için değişkenler
  activeTasks: number = 0;
  completedTasks: number = 0;

  constructor(
    private supabaseService: SupabaseService,
    private themeService: ThemeService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { 
    this.isDarkMode$ = this.themeService.darkMode$;
  }

  ngOnInit(): void {
    this.loadProjects();
    this.supabaseService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadTaskStats();
      }
    });
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  async loadProjects() {
    this.isLoading = true;
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user.data.user) {
        const projects = await this.supabaseService.getProjects(user.data.user.id);
        this.projects = projects;
        this.applyFilters(); // Filtreleme işlemini uygulayalım
        
        // Projeler yüklendikten sonra görev istatistiklerini de güncelleyelim
        if (this.currentUser) {
          this.loadTaskStats();
        }
      }
    } catch (error: any) {
      this.snackBar.open(error.message || 'Projeler yüklenirken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Görevlerin istatistiklerini yükle
  async loadTaskStats() {
    try {
      if (!this.currentUser || !this.currentUser.id) return;
      
      const stats = await this.supabaseService.getTaskStats(this.currentUser.id);
      this.activeTasks = stats.active;
      this.completedTasks = stats.completed;
    } catch (error: any) {
      console.error('Görev istatistikleri yüklenirken hata:', error);
      // Hata durumunda varsayılan değerleri göster
      this.activeTasks = 0;
      this.completedTasks = 0;
    }
  }

  // Filtreleme ve sıralama işlemlerini uygula
  applyFilters() {
    let result = [...this.projects];
    
    // Durum filtresini uygula
    if (this.statusFilter !== 'all') {
      result = result.filter(project => project.status === this.statusFilter);
    }
    
    // Arama terimini uygula
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      result = result.filter(project => 
        project.name.toLowerCase().includes(searchLower) || 
        (project.description && project.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Sıralama işlemini uygula
    switch(this.sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        result.sort((a, b) => {
          // created_at değeri yoksa yeni olarak kabul et
          const dateA = a.created_at ? new Date(a.created_at).getTime() : Date.now();
          const dateB = b.created_at ? new Date(b.created_at).getTime() : Date.now();
          return dateB - dateA;
        });
        break;
      case 'oldest':
        result.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : Date.now();
          const dateB = b.created_at ? new Date(b.created_at).getTime() : Date.now();
          return dateA - dateB;
        });
        break;
    }
    
    this.filteredProjects = result;
  }
  
  // Tüm filtreleri sıfırla
  resetFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.sortBy = 'newest';
    this.applyFilters();
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