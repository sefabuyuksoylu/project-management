import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { Project } from '../../models/project.model';
import { Notification } from '../../models/notification.model';
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
  userProfile: any = null;
  isDarkMode$: Observable<boolean>;
  
  // Bildirimler için dizi
  notifications: Notification[] = [];

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
        this.loadNotifications(); // Bildirimleri yükle
        this.loadUserProfile(); // Kullanıcı profil bilgisini yükle
      }
    });
  }

  // Kullanıcı profil bilgisini yükle
  async loadUserProfile(): Promise<void> {
    if (!this.currentUser) return;
    
    try {
      const { data } = await this.supabaseService.getUserProfile(this.currentUser.id);
      if (data) {
        this.userProfile = data;
      }
    } catch (error) {
      console.error('Profil bilgisi yüklenirken hata:', error);
    }
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  // Kullanıcı çıkış yapma fonksiyonu
  async signOut(): Promise<void> {
    try {
      await this.supabaseService.signOut();
      this.router.navigate(['/login']);
    } catch (error: any) {
      this.snackBar.open(error.message || 'Çıkış yapılırken hata oluştu!', 'Tamam', {
        duration: 3000
      });
    }
  }

  // Örnek bildirimler yükleniyor
  loadNotifications(): void {
    // Gerçek bir uygulamada bu veriler API'den gelecek
    this.notifications = [
      {
        id: '1',
        message: 'Yeni bir görev sizinle paylaşıldı',
        icon: 'assignment',
        time: new Date(Date.now() - 3600000), // 1 saat önce
        read: false
      },
      {
        id: '2',
        message: 'Proje teslim tarihi yaklaşıyor',
        icon: 'event',
        time: new Date(Date.now() - 86400000), // 1 gün önce
        read: false
      },
      {
        id: '3',
        message: 'Toplantı hatırlatması: Haftalık Durum',
        icon: 'groups',
        time: new Date(Date.now() - 172800000), // 2 gün önce
        read: true
      }
    ];
  }

  // Tüm bildirimleri okundu olarak işaretle
  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
  }

  // Okunmamış bildirimlerin sayısını döndüren yardımcı metod
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  async loadProjects() {
    this.isLoading = true;
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user.data.user) {
        const projects = await this.supabaseService.getProjects(user.data.user.id);
        
        // Debug: Orijinal proje verilerini görelim
        console.log('Ham proje verileri:', projects);
        
        // Projeler için görev sayılarını yükle
        const projectsWithTaskCounts = await Promise.all(projects.map(async project => {
          // Her proje için görev sayısını getir
          try {
            const tasks = await this.supabaseService.getTasks(project.id);
            return {
              ...project,
              taskCount: tasks.length,
              startDate: project.created_at,
              endDate: project.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              teamSize: project.team_size || 1,
              status: this.standardizeStatus(project.status)
            };
          } catch (error) {
            console.error(`Proje ${project.id} için görevler yüklenirken hata:`, error);
            return {
              ...project,
              taskCount: 0,
              startDate: project.created_at,
              endDate: project.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              teamSize: project.team_size || 1,
              status: this.standardizeStatus(project.status)
            };
          }
        }));
        
        this.projects = projectsWithTaskCounts;
        
        // Debug: Dönüştürülmüş projeleri görelim
        console.log('Dönüştürülmüş projeler:', this.projects.map(p => ({ 
          id: p.id, 
          name: p.name, 
          status: p.status,
          taskCount: p.taskCount 
        })));
        
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

  // Durum değerini standardize eden yardımcı fonksiyon
  standardizeStatus(status: string | undefined): string {
    // Project form'dan gelen 'active' durumunu 'in-progress' olarak eşleştirelim
    if (status === 'active') {
      return 'in-progress';
    }
    
    // Eğer durum değeri yoksa veya desteklenmeyen bir değerse, varsayılan atayalım
    if (!status || !['not-started', 'in-progress', 'completed', 'on-hold', 'archived'].includes(status)) {
      return 'in-progress';
    }
    
    return status;
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
    
    // Debug: Filtreleme başlangıcı
    console.log('Filtreleme başlıyor, toplam proje:', this.projects.length);
    console.log('Seçilen filtre:', this.statusFilter);
    console.log('Proje durumları:', this.projects.map(p => p.status));
    
    // Durum filtresini uygula
    if (this.statusFilter !== 'all') {
      result = result.filter(project => {
        // Tam eşleşme kontrolü yapalım ve durumunu yazdıralım
        const matches = project.status === this.statusFilter;
        console.log(`Proje: ${project.name}, Durum: ${project.status}, Filtre: ${this.statusFilter}, Eşleşiyor mu: ${matches}`);
        return matches;
      });
      
      console.log('Filtreleme sonucu:', result.length, 'proje bulundu');
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
      case 'alphabetical':
        result.sort((a, b) => a.name.localeCompare(b.name));
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

  // Proje detaylarını aç
  openProject(project: Project) {
    this.router.navigate(['/projects', project.id]);
  }
  
  // Proje silme işlemi
  async deleteProject(project: Project, event: Event) {
    // Olayın proje kartına tıklama olarak yayılmasını engelle
    event.stopPropagation();
    
    if (!project.id) return;
    
    if (confirm(`"${project.name}" projesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      try {
        this.isLoading = true;
        await this.supabaseService.deleteProject(project.id);
        this.snackBar.open('Proje başarıyla silindi!', 'Tamam', {
          duration: 3000
        });
        // Projeyi listeden kaldır
        this.projects = this.projects.filter(p => p.id !== project.id);
        this.applyFilters(); // Filtreleri yeniden uygula
      } catch (error: any) {
        this.snackBar.open(error.message || 'Proje silinirken hata oluştu!', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }
} 