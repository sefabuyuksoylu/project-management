import { Component, OnInit } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { SupabaseService } from './services/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isDarkMode$ = this.themeService.darkMode$;

  constructor(
    private themeService: ThemeService,
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    // Sayfa yenilendiğinde Auth durum kontrolü
    this.supabaseService.currentUser$.subscribe(user => {
      console.log('App component - user state:', user);
    });
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }
}
