import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Bill } from '../../services/data.service';
import { CaptchaService } from '../../services/captcha.service';

// To use jsPDF, we need to declare it.
declare var jspdf: any;

type ViewState = 'FORM' | 'LOADING' | 'BILL_DETAILS' | 'PAYMENT' | 'PAYMENT_PROCESSING' | 'SUCCESS';

@Component({
  selector: 'app-utility-bill',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './utility-bill.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilityBillComponent implements OnInit {
  private route = inject(ActivatedRoute);
  // Fix: Explicitly type `fb` as `FormBuilder` to resolve type inference issue where it was considered `unknown`.
  private fb: FormBuilder = inject(FormBuilder);
  private dataService = inject(DataService);
  captchaService = inject(CaptchaService);

  utilityType = signal<'Electricity' | 'Water'>('Electricity');
  viewState = signal<ViewState>('FORM');
  errorMessage = signal<string | null>(null);
  billDetails = signal<Bill | null>(null);
  transactionId = signal<string | null>(null);
  showConfirmationDialog = signal<boolean>(false);
  
  paymentMethod = signal<'UPI' | 'CARD'>('UPI');
  
  billForm = this.fb.group({
    consumerId: ['', [Validators.required, Validators.maxLength(13), Validators.pattern('^[a-zA-Z0-9]*$')]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    captcha: ['', Validators.required],
  });

  paymentForm = this.fb.group({
    upiId: [''],
    cardNumber: [''],
    expiry: [''],
    cvv: [''],
    cardHolder: ['']
  });

  formTitle = computed(() => `${this.utilityType()} Bill Payment`);

  ngOnInit() {
    const type = this.route.snapshot.data['utilityType'];
    if (type === 'Electricity' || type === 'Water') {
      this.utilityType.set(type);
    }
    this.captchaService.refresh();
  }

  fetchBill() {
    if (this.billForm.invalid) {
      this.billForm.markAllAsTouched();
      return;
    }
    if (!this.captchaService.verify(this.billForm.value.captcha)) {
      this.errorMessage.set('Invalid captcha. Please try again.');
      this.captchaService.refresh();
      this.billForm.get('captcha')?.reset();
      return;
    }

    this.viewState.set('LOADING');
    this.errorMessage.set(null);

    const { consumerId, phone } = this.billForm.value;
    this.dataService.fetchBill(this.utilityType(), consumerId!, phone!).subscribe({
      next: (bill) => {
        if (bill) {
          this.billDetails.set(bill);
          this.viewState.set('BILL_DETAILS');

          // Store user details for notification reminders
          if (typeof window !== 'undefined') {
            try {
              const userDetails = JSON.parse(localStorage.getItem('wardConnectUser') || '{}');
              const key = this.utilityType() === 'Electricity' ? 'electricityId' : 'waterId';
              userDetails[key] = bill.consumerId;
              userDetails.phone = bill.phone;
              localStorage.setItem('wardConnectUser', JSON.stringify(userDetails));
            } catch (e) {
              console.error('Could not save user details to localStorage', e);
            }
          }

        } else {
          this.errorMessage.set('Bill details not found. Please check your Consumer Number and Phone Number.');
          this.viewState.set('FORM');
        }
        this.captchaService.refresh();
        this.billForm.get('captcha')?.reset();
      },
      error: () => {
        this.errorMessage.set('An error occurred while fetching bill details.');
        this.viewState.set('FORM');
        this.captchaService.refresh();
        this.billForm.get('captcha')?.reset();
      }
    });
  }

  proceedToPayment() {
    this.viewState.set('PAYMENT');
  }

  payBill() {
    // Show confirmation dialog instead of immediate payment
    this.showConfirmationDialog.set(true);
  }

  executePayment() {
    this.showConfirmationDialog.set(false);
    this.viewState.set('PAYMENT_PROCESSING');
    const bill = this.billDetails();
    if (bill) {
        this.dataService.processPayment(bill.consumerId, bill.amount, this.utilityType(), bill.phone).subscribe(res => {
            if (res.status === 'SUCCESS') {
                this.transactionId.set(res.transactionId);
                this.viewState.set('SUCCESS');
            }
        });
    }
  }

  cancelPayment() {
    this.showConfirmationDialog.set(false);
  }

  downloadReceipt() {
    const bill = this.billDetails();
    if (!bill || !this.transactionId()) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("WardConnect Payment Receipt", 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Transaction ID: ${this.transactionId()}`, 14, 40);
    doc.text(`Payment Date: ${new Date().toLocaleDateString()}`, 14, 48);

    doc.line(14, 55, 196, 55);

    doc.setFontSize(16);
    doc.text("Bill Details", 14, 65);

    doc.setFontSize(12);
    doc.text(`Service Type:`, 14, 75);
    doc.text(`${this.utilityType()} Bill`, 70, 75);

    doc.text(`Consumer Name:`, 14, 83);
    doc.text(`${bill.consumerName}`, 70, 83);

    doc.text(`Consumer Number:`, 14, 91);
    doc.text(`${bill.consumerId}`, 70, 91);

    doc.text(`Bill Date:`, 14, 99);
    doc.text(`${new Date(bill.billDate).toLocaleDateString()}`, 70, 99);

    doc.line(14, 110, 196, 110);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Amount Paid:`, 14, 120);
    doc.text(`Rs. ${bill.amount.toFixed(2)}`, 196, 120, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("This is a computer-generated receipt and does not require a signature.", 105, 140, { align: 'center' });

    doc.save(`WardConnect_Receipt_${this.transactionId()}.pdf`);
  }

  reset() {
    this.billForm.reset();
    this.paymentForm.reset();
    this.billDetails.set(null);
    this.errorMessage.set(null);
    this.transactionId.set(null);
    this.viewState.set('FORM');
    this.captchaService.refresh();
  }
}
