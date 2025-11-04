import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  isDark = signal<boolean>(this.getInitialTheme());

  constructor() {
    this.updateTheme(this.isDark());
  }

  private getInitialTheme(): boolean {
    if (typeof window !== 'undefined') {
      const storedPreference = localStorage.getItem('theme');
      if (storedPreference) {
        return storedPreference === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false; // Default to light theme on server
  }

  toggleTheme(): void {
    this.isDark.update(current => {
      const newTheme = !current;
      this.updateTheme(newTheme);
      return newTheme;
    });
  }

  private updateTheme(isDark: boolean): void {
     if (typeof window !== 'undefined') {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
     }
  }
}
