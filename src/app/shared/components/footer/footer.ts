
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, FormsModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  email = '';

  subscribe() {
    if (this.email.trim()) {
      console.log('Newsletter email:', this.email);
      this.email = '';
    }
  }
}
