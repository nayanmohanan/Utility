import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { of } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';
import { AudioService } from '../../services/audio.service';
declare var jspdf: any;

type ViewState = 'FORM' | 'LOADING' | 'DETAILS' | 'PAYMENT' | 'SUCCESS';

@Component({
  selector: 'app-gas-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gas-booking.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GasBookingComponent {
  // Fix: Explicitly type `fb` as `FormBuilder` to resolve type inference issue where it was considered `unknown`.
  private fb: FormBuilder = inject(FormBuilder);
  private dataService = inject(DataService);
  private audioService = inject(AudioService);

  viewState = signal<ViewState>('FORM');
  errorMessage = signal<string | null>(null);
  gasDetails = signal<any>(null);
  transactionId = signal<string | null>(null);
  paymentMethod = signal<'UPI' | 'CARD'>('UPI');
  showConfirmationDialog = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  
  providers = [
    { name: 'Indane (Indian Oil)', logo: '<svg viewBox="0 0 24 24" class="w-8 h-8 text-orange-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c-4.42 0-8 3.58-8 8 0 2.36.96 4.5 2.52 6.03l-.01.01c-1.35 1.46-2.22 3.34-2.48 5.46h15.94c-.26-2.12-1.13-4-2.48-5.46l-.01-.01C19.04 14.5 20 12.36 20 10c0-4.42-3.58-8-8-8zm0 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>' },
    { name: 'Bharat Gas', logo: '<svg viewBox="0 0 24 24" class="w-8 h-8 text-blue-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 3a9 9 0 0 0-9 9c0 3.32 1.8 6.22 4.5 7.73.3.18.5.5.5.85v1.42c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1.42c0-.35.2-.67.5-.85C19.2 18.22 21 15.32 21 12a9 9 0 0 0-9-9zm-1 11h2v-2h-2v2zm0-4h2V7h-2v3z"/></svg>' },
    { name: 'HP Gas', logo: '<svg viewBox="0 0 24 24" class="w-8 h-8 text-red-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.98 2.5l-8.48 8.48c-1.95 1.95-1.95 5.12 0 7.07l4.95 4.95c1.95 1.95 5.12 1.95 7.07 0l8.48-8.48c-1.3-1.3-2.6-2.5-3.53-3.53L12.98 2.5zm-1.06 10.58l-2.12-2.12 4.24-4.24 2.12 2.12-4.24 4.24z"/></svg>' },
    { name: 'Reliance Gas', logo: '<svg viewBox="0 0 24 24" class="w-8 h-8 text-green-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.08 14.5l-4.58-4.58L6 16.42l-1.41-1.41L9.08 10.5 4.5 5.92 5.91 4.5l4.58 4.58L15 4.5l1.41 1.41L11.92 10.5l4.58 4.58L15.08 16.5z"/></svg>' },
  ];

  bookingForm = this.fb.group({
    provider: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
  });

  paymentForm = this.fb.group({
    upiId: [''],
    cardNumber: [''],
    expiry: [''],
    cvv: [''],
    cardHolder: ['']
  });

  fetchDetails() {
    if (this.bookingForm.invalid) return;

    this.viewState.set('LOADING');
    this.errorMessage.set(null);
    const { provider, phone } = this.bookingForm.value;

    this.dataService.fetchGasDetails(provider!, phone!).subscribe({
      next: (details) => {
        if (details) {
          this.gasDetails.set(details);
          this.viewState.set('DETAILS');
        } else {
          this.errorMessage.set('Details not found for the provided phone number.');
          this.viewState.set('FORM');
        }
      },
      error: () => {
        this.errorMessage.set('An error occurred while fetching details.');
        this.viewState.set('FORM');
      }
    });
  }
  
  proceedToPayment() {
    this.viewState.set('PAYMENT');
  }

  bookGas() {
    this.showConfirmationDialog.set(true);
  }

  executeBooking() {
    this.showConfirmationDialog.set(false);
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    const details = this.gasDetails();
    if(details) {
       // Adding a delay to simulate real API call
      const delayedBooking$ = of(null).pipe(delay(2000), switchMap(() =>
        this.dataService.processPayment(details.consumerId, details.amount, 'Gas', details.phone)
      ));

      delayedBooking$.subscribe({
        next: res => {
          this.transactionId.set(res.transactionId);
          this.viewState.set('SUCCESS');
          this.audioService.playSuccessSound();
          this.isProcessing.set(false);
        },
        error: () => {
          this.isProcessing.set(false);
          this.errorMessage.set('An error occurred during booking. Please try again.');
        }
      });
    } else {
      this.isProcessing.set(false);
    }
  }

  cancelBooking() {
    this.showConfirmationDialog.set(false);
  }

  downloadReceipt() {
    const details = this.gasDetails();
    if (!details || !this.transactionId()) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("WardConnect Gas Booking Receipt", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Transaction ID: ${this.transactionId()}`, 14, 40);
    doc.text(`Booking Date: ${new Date().toLocaleDateString()}`, 14, 48);
    doc.line(14, 55, 196, 55);
    doc.setFontSize(16);
    doc.text("Booking Details", 14, 65);
    doc.setFontSize(12);
    doc.text(`Provider:`, 14, 75);
    doc.text(`${this.bookingForm.value.provider}`, 70, 75);
    doc.text(`Consumer Name:`, 14, 83);
    doc.text(`${details.consumerName}`, 70, 83);
    doc.text(`Consumer ID:`, 14, 91);
    doc.text(`${details.consumerId}`, 70, 91);
    doc.line(14, 110, 196, 110);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Amount Paid:`, 14, 120);
    doc.text(`Rs. ${details.amount.toFixed(2)}`, 196, 120, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("This is a computer-generated receipt and does not require a signature.", 105, 140, { align: 'center' });

    doc.save(`WardConnect_GasReceipt_${this.transactionId()}.pdf`);
  }
  
  reset() {
    this.bookingForm.reset();
    this.gasDetails.set(null);
    this.errorMessage.set(null);
    this.transactionId.set(null);
    this.viewState.set('FORM');
    this.isProcessing.set(false);
  }
}
