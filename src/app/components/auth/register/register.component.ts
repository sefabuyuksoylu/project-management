import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  isLoading = false;
  hidePassword = true;
  errorMessage = '';
  registerForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  });
  
  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Hala aktif bir oturum olup olmadığını kontrol et
    this.supabaseService.currentUser$.subscribe(user => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  checkPasswordMatch(): boolean {
    return this.registerForm.value.password === this.registerForm.value.confirmPassword;
  }

  async register() {
    if (this.registerForm.invalid) {
      return;
    }

    if (!this.checkPasswordMatch()) {
      this.errorMessage = 'Şifreler eşleşmiyor';
      this.snackBar.open('Şifreler eşleşmiyor!', 'Tamam', { duration: 3000 });
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      // Kilitleri temizleme denemesi (lokal depolama temizlenir)
      try {
        localStorage.removeItem('project-management-auth');
        sessionStorage.removeItem('project-management-auth');
      } catch (e) {
        console.warn('Depolama temizlenirken hata:', e);
      }
      
      // Önce bir timeout bekleyelim (kilit sorunlarını azaltmak için)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Birkaç deneme yapalım - bazen ilk deneme başarısız olabilir
      let retries = 3;
      let lastError: any = null;
      
      while (retries > 0) {
        try {
          const result = await this.supabaseService.signUp(
            this.registerForm.value.email || '',
            this.registerForm.value.password || ''
          );
          
          if (result.user) {
            // Manuel profil oluşturma - mevcut tabloya uygun olarak
            try {
              const { error: profileError } = await this.supabaseService.supabase
                .from('profiles')
                .upsert([
                  {
                    id: result.user.id,
                    full_name: '',
                    avatar_url: null,
                    title: '',
                    bio: '',
                    role: 'user',
                    created_at: new Date(),
                    updated_at: new Date(),
                    email: this.registerForm.value.email || '',
                    username: ''
                  }
                ], { onConflict: 'id' });
              
              if (profileError) {
                console.warn('Manuel profil oluşturma hatası:', profileError);
                // Hata olsa bile devam et - ana kayıt işlemini etkilemesin
              }
            } catch (profileError) {
              console.error('Profil oluşturma hatası:', profileError);
            }
          }
          
          this.isLoading = false;
          this.snackBar.open('Kayıt başarılı! E-posta adresinize gönderilen onay bağlantısını kontrol edin.', 'Tamam', { duration: 5000 });
          this.router.navigate(['/login']);
          return; // Başarılı olursa döngüden çık
        } catch (error: any) {
          lastError = error;
          console.error('Kayıt denemesi başarısız oldu:', error);
          
          // Eğer "Email already registered" hatası alırsak tekrar denemeye gerek yok
          if (error.message && error.message.includes('Email already registered')) {
            break;
          }
          
          // DB hataları için tekrar deneme
          if (error.message && (
            error.message.includes('Database') || 
            error.message.includes('timeout') || 
            error.message.includes('constraint') ||
            error.message.includes('violates')
          )) {
            retries--;
            console.log(`Veritabanı hatası nedeniyle tekrar deneniyor. Kalan: ${retries}`);
            // Tekrar denemeden önce bekle
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          // Diğer hatalar için tekrar deneme yapmaya gerek yok
          break;
        }
      }
      
      // Tüm denemeler başarısız olduysa
      this.isLoading = false;
      
      if (lastError) {
        if (lastError.message && lastError.message.includes('Email already registered')) {
          this.errorMessage = 'Bu e-posta adresi zaten kayıtlı';
        } else if (lastError.message && (
          lastError.message.includes('Database') || 
          lastError.message.includes('constraint') || 
          lastError.message.includes('violates')
        )) {
          this.errorMessage = 'Veritabanı hatası: Profil oluşturulamadı. Daha sonra tekrar deneyiniz.';
        } else if (lastError.message && lastError.message.includes('timeout')) {
          this.errorMessage = 'Bağlantı zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyiniz.';
        } else {
          this.errorMessage = `Kayıt sırasında hata: ${lastError.message || 'Bilinmeyen hata'}`;
        }
        
        this.snackBar.open(this.errorMessage, 'Tamam', { duration: 5000 });
        console.error('Kayıt hatası (son):', lastError);
      }
      
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage = `Beklenmeyen bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`;
      this.snackBar.open(this.errorMessage, 'Tamam', { duration: 5000 });
      console.error('Kritik kayıt hatası:', error);
    }
  }
} 