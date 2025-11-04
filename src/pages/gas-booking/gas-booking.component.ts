import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
declare var jspdf: any;

type ViewState = 'FORM' | 'LOADING' | 'DETAILS' | 'PAYMENT' | 'PAYMENT_PROCESSING' | 'SUCCESS';

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

  viewState = signal<ViewState>('FORM');
  errorMessage = signal<string | null>(null);
  gasDetails = signal<any>(null);
  transactionId = signal<string | null>(null);
  paymentMethod = signal<'UPI' | 'CARD'>('UPI');
  showConfirmationDialog = signal<boolean>(false);
  
  providers = [
    { name: 'Indane (Indian Oil)', logo: '...' },
    { name: 'Bharat Gas', logo: '...' },
    { name: 'HP Gas', logo: '...' },
    { name: 'Reliance Gas', logo: '...' },
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
    this.viewState.set('PAYMENT_PROCESSING');
    const details = this.gasDetails();
    if(details) {
      this.dataService.processPayment(details.consumerId, details.amount, 'Gas', details.phone).subscribe(res => {
        this.transactionId.set(res.transactionId);
        this.viewState.set('SUCCESS');
      });
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
  }
}