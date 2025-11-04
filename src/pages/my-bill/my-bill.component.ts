import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService, Transaction } from '../../services/data.service';

// To use jsPDF, we need to declare it.
declare var jspdf: any;

type ViewState = 'FORM' | 'LOADING' | 'RESULTS' | 'NO_RESULTS';

@Component({
  selector: 'app-my-bill',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './my-bill.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBillComponent {
  // Fix: Explicitly type `fb` as `FormBuilder` to resolve type inference issue where it was considered `unknown`.
  private fb: FormBuilder = inject(FormBuilder);
  private dataService = inject(DataService);

  viewState = signal<ViewState>('FORM');
  transactions = signal<Transaction[]>([]);

  sortColumn = signal<keyof Transaction | null>('date');
  sortDirection = signal<'asc' | 'desc'>('desc');
  filterText = signal<string>('');

  displayedTransactions = computed(() => {
    const txns = this.transactions();
    const filter = this.filterText().toLowerCase().trim();
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();

    // 1. Filtering
    const filteredTxns = !filter
      ? txns
      : txns.filter(t =>
          t.transactionId.toLowerCase().includes(filter) ||
          t.service.toLowerCase().includes(filter) ||
          t.status.toLowerCase().includes(filter) ||
          String(t.amount).includes(filter)
        );

    // 2. Sorting
    if (!sortCol) {
      return filteredTxns;
    }
    
    const sortedTxns = [...filteredTxns];
    sortedTxns.sort((a, b) => {
      const keyA = a[sortCol as keyof Transaction];
      const keyB = b[sortCol as keyof Transaction];

      let comparison = 0;

      if (keyA > keyB) {
        comparison = 1;
      } else if (keyA < keyB) {
        comparison = -1;
      }

      return sortDir === 'asc' ? comparison : -comparison;
    });

    return sortedTxns;
  });

  searchForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    consumerId: ['', [Validators.required, Validators.maxLength(13)]],
  });

  fetchTransactions() {
    if (this.searchForm.invalid) return;

    this.viewState.set('LOADING');
    const { phone, consumerId } = this.searchForm.value;

    this.dataService.getTransactions(phone!, consumerId!).subscribe(data => {
      if (data && data.length > 0) {
        this.transactions.set(data);
        this.viewState.set('RESULTS');
      } else {
        this.viewState.set('NO_RESULTS');
      }
    });
  }

  searchAgain() {
    this.searchForm.reset();
    this.viewState.set('FORM');
    this.transactions.set([]);
    this.filterText.set('');
  }

  onSort(column: keyof Transaction) {
    if (this.sortColumn() === column) {
      this.sortDirection.update(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  onFilterChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filterText.set(input.value);
  }

  downloadReceipt(transaction: Transaction) {
    if (!transaction) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("WardConnect Payment Receipt", 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Transaction ID: ${transaction.transactionId}`, 14, 40);
    doc.text(`Payment Date: ${new Date(transaction.date).toLocaleDateString()}`, 14, 48);

    doc.line(14, 55, 196, 55);

    doc.setFontSize(16);
    doc.text("Payment Details", 14, 65);

    doc.setFontSize(12);
    doc.text(`Service Type:`, 14, 75);
    doc.text(`${transaction.service}`, 70, 75);

    doc.text(`Consumer ID:`, 14, 83);
    doc.text(`${transaction.consumerId}`, 70, 83);
    
    doc.text(`Registered Phone:`, 14, 91);
    doc.text(`${transaction.phone}`, 70, 91);
    
    doc.line(14, 100, 196, 100);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Amount Paid:`, 14, 110);
    doc.text(`Rs. ${transaction.amount.toFixed(2)}`, 196, 110, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("This is a computer-generated receipt and does not require a signature.", 105, 130, { align: 'center' });

    doc.save(`WardConnect_Receipt_${transaction.transactionId}.pdf`);
  }
}
