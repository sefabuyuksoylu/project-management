import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  darkMode$ = this.darkModeSubject.asObservable();
  private defaultThemeLink = 'assets/themes/light-theme.css';
  private darkThemeLink = 'assets/themes/dark-theme.css';

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    
    // LocalStorage'dan tema tercihini yükle
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.darkModeSubject.next(savedTheme === 'dark');
      this.applyTheme(savedTheme === 'dark');
    } else {
      // Kullanıcının sistem tercihine göre tema ayarla
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.darkModeSubject.next(prefersDark);
      this.applyTheme(prefersDark);
    }
  }

  toggleDarkMode(): void {
    const isDarkMode = !this.darkModeSubject.value;
    this.darkModeSubject.next(isDarkMode);
    
    // Temayı uygula ve Local Storage'a kaydet
    this.applyTheme(isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }

  private applyTheme(isDarkMode: boolean): void {
    if (isDarkMode) {
      this.renderer.addClass(document.body, 'dark-theme');
      this.renderer.removeClass(document.body, 'light-theme');
    } else {
      this.renderer.addClass(document.body, 'light-theme');
      this.renderer.removeClass(document.body, 'dark-theme');
    }

    // Eğer tema dosyası varsa değiştir
    this.updateThemeLink(isDarkMode);
  }

  private updateThemeLink(isDarkMode: boolean): void {
    const head = document.getElementsByTagName('head')[0];
    const themeLink = document.getElementById('app-theme') as HTMLLinkElement;
    
    if (themeLink) {
      themeLink.href = isDarkMode ? this.darkThemeLink : this.defaultThemeLink;
    }
  }

  // Observable'a daha kolay erişim için getter
  get isDarkMode$() {
    return this.darkMode$;
  }

  // Mevcut tema durumunu doğrudan almak için getter
  get isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
} 