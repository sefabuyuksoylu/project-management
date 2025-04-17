import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  darkMode$ = this.darkMode.asObservable();
  private renderer: Renderer2;
  private defaultThemeLink = 'assets/themes/light-theme.css';
  private darkThemeLink = 'assets/themes/dark-theme.css';

  constructor(private rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    
    // LocalStorage'dan tema tercihini al
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme) {
      const isDarkMode = savedTheme === 'true';
      this.darkMode.next(isDarkMode);
      this.applyTheme(isDarkMode);
    }
  }

  toggleDarkMode(): void {
    const newValue = !this.darkMode.value;
    this.darkMode.next(newValue);
    this.applyTheme(newValue);
    localStorage.setItem('darkMode', newValue.toString());
  }

  private applyTheme(isDarkMode: boolean): void {
    const body = document.getElementsByTagName('body')[0];
    if (isDarkMode) {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
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
} 