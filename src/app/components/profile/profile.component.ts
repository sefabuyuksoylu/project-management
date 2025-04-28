import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: any;
  isLoading = false;
  avatarUrl: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private supabaseService: SupabaseService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      title: [''],
      bio: ['', Validators.maxLength(300)]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  async loadUserProfile() {
    this.isLoading = true;
    try {
      const { data } = await this.supabaseService.getCurrentUser();
      this.currentUser = data.user;
      
      if (this.currentUser) {
        // Kullanıcı profil bilgilerini al
        const { data: profile } = await this.supabaseService.getUserProfile(this.currentUser.id);
        
        if (profile) {
          this.profileForm.patchValue({
            name: profile.full_name || '',
            email: this.currentUser.email,
            title: profile.title || '',
            bio: profile.bio || ''
          });
          
          this.avatarUrl = profile.avatar_url;
        } else {
          this.profileForm.get('email')?.setValue(this.currentUser.email);
        }
      }
    } catch (error: any) {
      this.snackBar.open('Profil bilgileri yüklenirken hata oluştu', 'Tamam', {
        duration: 3000
      });
      console.error('Profil yükleme hatası:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Maksimum boyut kontrolü (2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.snackBar.open('Dosya boyutu 2MB\'dan küçük olmalı', 'Tamam', {
          duration: 3000
        });
        return;
      }
      
      // Dosya tipi kontrolü
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Lütfen bir resim dosyası seçin', 'Tamam', {
          duration: 3000
        });
        return;
      }
      
      this.selectedFile = file;
      
      // Önizleme göster
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      try {
        // Profil bilgilerini güncelle
        const profileData = {
          id: this.currentUser.id,
          full_name: this.profileForm.get('name')?.value,
          title: this.profileForm.get('title')?.value,
          bio: this.profileForm.get('bio')?.value,
          updated_at: new Date()
        };
        
        await this.supabaseService.updateUserProfile(profileData);
        
        // Avatar güncelleme
        if (this.selectedFile) {
          await this.supabaseService.uploadAvatar(this.currentUser.id, this.selectedFile);
        }
        
        this.snackBar.open('Profil başarıyla güncellendi', 'Tamam', {
          duration: 3000
        });
      } catch (error: any) {
        this.snackBar.open(error.message || 'Profil güncellenirken hata oluştu', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  removeAvatar() {
    this.avatarUrl = null;
    this.selectedFile = null;
  }
} 