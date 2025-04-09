import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor(
    private formBuilder: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { 
    this.registerForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.checkPasswords });
  }

  ngOnInit(): void {
  }

  // Şifre eşleşme kontrolü
  checkPasswords(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { notSame: true };
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      const { email, password } = this.registerForm.value;
      
      try {
        await this.supabaseService.signUp(email, password);
        this.snackBar.open('Kayıt başarılı! E-posta adresinizi kontrol edin.', 'Tamam', {
          duration: 5000
        });
        this.router.navigate(['/login']);
      } catch (error: any) {
        this.snackBar.open(error.message || 'Kayıt başarısız!', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }
} 