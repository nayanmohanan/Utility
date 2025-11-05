import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  notificationService = inject(NotificationService);
  showNotification = signal(true);

  shouldShowNotification = computed(() => {
    return this.showNotification() && !this.notificationService.isLoading() && this.notificationService.pendingBills().length > 0;
  });

  services = [
    {
      title: 'Electricity',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-500" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>',
      description: 'Pay your electricity bills instantly.',
      details: 'Support for all major providers with real-time processing.',
      features: 'Instant Payment | 24/7 Service | E-Receipt.',
      link: '/utility/electricitybill'
    },
    {
      title: 'Water',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>',
      description: 'Clear your water utility dues with ease.',
      details: 'A secure and reliable platform for all your water bill payments.',
      features: 'Quick Pay | Secure | All Boards.',
      link: '/utility/waterbill'
    },
    {
      title: 'Gas',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2.286 1.143 5 0 7-2 0 0 .714 2.857 0 4.286-1.143 2.286-4.286 2.857-7 0-1.714-1.714 0-4.286 0-4.286" /><path d="M9 10s.429 2.286-1.714 4.286c-2.286 2-2.286 5.714 0 7.143 2.286 1.428 5.714 1.428 7.143 0 2.286-2.286 1.143-5.714 0-7.143C10.286 12.857 9 10 9 10z" /></svg>',
      description: 'Book your LPG cylinder in seconds.',
      details: 'Fast booking for all major gas providers across the region.',
      features: 'Simple Booking | Track Status | All Providers.',
      link: '/utility/gasbooking'
    }
  ];

  ngOnInit() {
    this.notificationService.checkForPendingBills();
  }

  dismissNotification() {
    this.showNotification.set(false);
  }

  scrollToServices() {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  }
}