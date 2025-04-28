import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;
  currentUser: any;
  isLoading = false;
  isDarkMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private supabaseService: SupabaseService,
    private themeService: ThemeService,
    private snackBar: MatSnackBar
  ) {
    this.settingsForm = this.formBuilder.group({
      emailNotifications: [true],
      pushNotifications: [true],
      language: ['tr'],
      timezone: ['Europe/Istanbul']
    });
  }

  ngOnInit(): void {
    this.loadUserSettings();
    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  toggleDarkMode(event: MatSlideToggleChange) {
    if (event.checked !== this.isDarkMode) {
      this.themeService.toggleDarkMode();
    }
  }

  async loadUserSettings() {
    this.isLoading = true;
    try {
      const { data } = await this.supabaseService.getCurrentUser();
      this.currentUser = data.user;
      
      if (this.currentUser) {
        // Kullanıcı ayarlarını al
        const { data: settings } = await this.supabaseService.getUserSettings(this.currentUser.id);
        
        if (settings) {
          this.settingsForm.patchValue({
            emailNotifications: settings.email_notifications,
            pushNotifications: settings.push_notifications,
            language: settings.language || 'tr',
            timezone: settings.timezone || 'Europe/Istanbul'
          });
        }
      }
    } catch (error: any) {
      this.snackBar.open('Ayarlar yüklenirken hata oluştu', 'Tamam', {
        duration: 3000
      });
      console.error('Ayarlar yükleme hatası:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (this.settingsForm.valid) {
      this.isLoading = true;
      try {
        const settingsData = {
          user_id: this.currentUser.id,
          email_notifications: this.settingsForm.get('emailNotifications')?.value,
          push_notifications: this.settingsForm.get('pushNotifications')?.value,
          language: this.settingsForm.get('language')?.value,
          timezone: this.settingsForm.get('timezone')?.value,
          updated_at: new Date()
        };
        
        await this.supabaseService.updateUserSettings(settingsData);
        
        this.snackBar.open('Ayarlar başarıyla güncellendi', 'Tamam', {
          duration: 3000
        });
      } catch (error: any) {
        this.snackBar.open(error.message || 'Ayarlar güncellenirken hata oluştu', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  async resetSettings() {
    const defaultSettings = {
      emailNotifications: true,
      pushNotifications: true,
      language: 'tr',
      timezone: 'Europe/Istanbul'
    };
    
    this.settingsForm.patchValue(defaultSettings);
  }

  openChangePasswordDialog() {
    // Şifre değiştirme için diyalog aç
    // Bu fonksiyon ileri seviye uygulamada gerçekleştirilecek
    this.snackBar.open('Şifre değiştirme özelliği yakında eklenecek', 'Tamam', {
      duration: 3000
    });
  }

  async deleteAccount() {
    // Hesap silme işlemi için onay al
    if (confirm('Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
      this.isLoading = true;
      try {
        await this.supabaseService.deleteUserAccount(this.currentUser.id);
        
        this.snackBar.open('Hesabınız başarıyla silindi', 'Tamam', {
          duration: 3000
        });
        
        // Oturumu kapat ve giriş sayfasına yönlendir
        this.supabaseService.signOut();
      } catch (error: any) {
        this.snackBar.open(error.message || 'Hesap silinirken hata oluştu', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }
} 