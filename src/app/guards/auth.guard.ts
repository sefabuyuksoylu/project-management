import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';
import { map, catchError, take, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('AuthGuard - checking authorization for route:', state.url);
    
    return this.supabaseService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        if (user) {
          console.log('AuthGuard - user authenticated:', user.email);
          return of(true);
        } else {
          console.log('AuthGuard - no user, checking session...');
          // Kullanıcı yoksa oturum kontrolü yap
          return this.checkSession();
        }
      }),
      catchError(error => {
        console.error('AuthGuard error:', error);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }

  // Oturum kontrolü
  private checkSession(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.supabaseService.supabase.auth.getSession()
        .then(({ data }) => {
          if (data.session) {
            console.log('AuthGuard - active session found');
            observer.next(true);
          } else {
            console.log('AuthGuard - no active session');
            this.router.navigate(['/login']);
            observer.next(false);
          }
          observer.complete();
        })
        .catch(error => {
          console.error('AuthGuard session check error:', error);
          this.router.navigate(['/login']);
          observer.next(false);
          observer.complete();
        });
    });
  }
} 