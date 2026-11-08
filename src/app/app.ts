
import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  showLayout = true;

  constructor(private router: Router) {
    this.updateLayout(this.router.url);

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        this.updateLayout(event.urlAfterRedirects);
      });
  }

  private updateLayout(url: string) {
    const hiddenPages = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/auth/reset-password',
      '/verify-email'
    ];

    this.showLayout = !hiddenPages.includes(url.split('?')[0]);
  }
}
