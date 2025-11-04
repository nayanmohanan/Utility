import { Injectable, signal, inject } from '@angular/core';
import { DataService } from './data.service';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PendingBillInfo {
  type: 'Electricity' | 'Water';
  dueDate: string;
  link: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private dataService = inject(DataService);
  pendingBills = signal<PendingBillInfo[]>([]);
  isLoading = signal<boolean>(true);

  checkForPendingBills() {
    this.isLoading.set(true);
    const userDetailsString = typeof window !== 'undefined' ? localStorage.getItem('wardConnectUser') : null;
    if (!userDetailsString) {
      this.isLoading.set(false);
      return;
    }

    try {
        const userDetails = JSON.parse(userDetailsString);
        const { phone, electricityId, waterId } = userDetails;

        if (!phone || (!electricityId && !waterId)) {
            this.isLoading.set(false);
            return;
        }

        const electricityCheck$ = electricityId
        ? this.dataService.fetchBill('Electricity', electricityId, phone).pipe(map(bill => ({ type: 'Electricity', bill })))
        : of({ type: 'Electricity', bill: null });

        const waterCheck$ = waterId
        ? this.dataService.fetchBill('Water', waterId, phone).pipe(map(bill => ({ type: 'Water', bill })))
        : of({ type: 'Water', bill: null });

        forkJoin([electricityCheck$, waterCheck$]).subscribe({
        next: (results) => {
            const pending = results
            .filter(result => result.bill && result.bill.status === 'PENDING')
            .map(result => ({
                type: result.type as 'Electricity' | 'Water',
                dueDate: result.bill!.dueDate,
                link: result.type === 'Electricity' ? '/utility/electricitybill' : '/utility/waterbill'
            }));
            this.pendingBills.set(pending);
            this.isLoading.set(false);
        },
        error: () => {
            this.isLoading.set(false);
        }
        });
    } catch (e) {
        console.error("Failed to parse user details from localStorage", e);
        this.isLoading.set(false);
    }
  }
}
