import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor(
    private formBuilder: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { 
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;
      
      try {
        await this.supabaseService.signIn(email, password);
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.snackBar.open(error.message || 'Giriş başarısız!', 'Tamam', {
          duration: 3000
        });
      } finally {
        this.isLoading = false;
      }
    }
  }
} 