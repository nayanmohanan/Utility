import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

// In a real application, these models would be in their own files.
export interface Bill {
  consumerId: string;
  consumerName: string;
  phone: string;
  billDate: string;
  amount: number;
  status: 'PAID' | 'PENDING';
  dueDate: string;
}

export interface Transaction {
  transactionId: string;
  date: string;
  service: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  consumerId: string;
  phone: string;
}

// Dummy Data as a fallback if localStorage is empty
const ELECTRICITY_BILLS: Bill[] = [
  { consumerId: 'ELEC12345', consumerName: 'John Doe', phone: '1234567890', billDate: '2024-07-01', amount: 1250.50, status: 'PENDING', dueDate: '2024-07-20' },
  { consumerId: 'ELEC67890', consumerName: 'Jane Smith', phone: '0987654321', billDate: '2024-07-05', amount: 850.00, status: 'PAID', dueDate: '2024-07-25' },
];

const WATER_BILLS: Bill[] = [
  { consumerId: 'WAT12345', consumerName: 'John Doe', phone: '1234567890', billDate: '2024-07-02', amount: 450.00, status: 'PENDING', dueDate: '2024-07-22' },
  { consumerId: 'WAT67890', consumerName: 'Peter Jones', phone: '1122334455', billDate: '2024-07-06', amount: 300.75, status: 'PENDING', dueDate: '2024-07-28' },
];

const GAS_DETAILS = [
    { consumerId: 'GAS12345', consumerName: 'John Doe', phone: '1234567890', provider: 'Indane (Indian Oil)', amount: 950.00 },
    { consumerId: 'GAS67890', consumerName: 'Jane Smith', phone: '0987654321', provider: 'Bharat Gas', amount: 975.00 }
];

const TRANSACTIONS: Transaction[] = [
    { transactionId: 'TXN1720112233', date: '2024-06-15', service: 'Electricity', amount: 1100.00, status: 'SUCCESS', consumerId: 'ELEC67890', phone: '0987654321' },
    { transactionId: 'TXN1720112244', date: '2024-06-20', service: 'Water', amount: 400.00, status: 'SUCCESS', consumerId: 'WAT12345', phone: '1234567890' },
];


@Injectable({ providedIn: 'root' })
export class DataService {
  private electricityBills: Bill[];
  private waterBills: Bill[];
  private gasDetails: any[];
  private transactions: Transaction[];

  constructor() {
    this.electricityBills = this.loadFromStorage('electricityBills', ELECTRICITY_BILLS);
    this.waterBills = this.loadFromStorage('waterBills', WATER_BILLS);
    this.gasDetails = this.loadFromStorage('gasDetails', GAS_DETAILS);
    this.transactions = this.loadFromStorage('transactions', TRANSACTIONS);
  }
  
  private loadFromStorage<T>(key: string, defaultValue: T[]): T[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    }
    return defaultValue;
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  fetchBill(type: 'Electricity' | 'Water', consumerId: string, phone: string): Observable<Bill | undefined> {
    const bills = type === 'Electricity' ? this.electricityBills : this.waterBills;
    const bill = bills.find(b => b.consumerId === consumerId && b.phone === phone);
    return of(bill);
  }
  
  fetchGasDetails(provider: string, phone: string): Observable<any> {
    const details = this.gasDetails.find(g => g.phone === phone && g.provider === provider);
    return of(details);
  }

  processPayment(consumerId: string, amount: number, service: string, phone: string): Observable<{ transactionId: string, status: 'SUCCESS' }> {
    const transactionId = `TXN${Date.now()}`;
    
    const newTransaction: Transaction = {
      transactionId,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      service,
      amount,
      status: 'SUCCESS',
      consumerId,
      phone
    };
    
    this.transactions.push(newTransaction);
    this.saveToStorage('transactions', this.transactions);

    if (service === 'Electricity') {
      const bill = this.electricityBills.find(b => b.consumerId === consumerId);
      if (bill) bill.status = 'PAID';
      this.saveToStorage('electricityBills', this.electricityBills);
    } else if (service === 'Water') {
      const bill = this.waterBills.find(b => b.consumerId === consumerId);
      if (bill) bill.status = 'PAID';
      this.saveToStorage('waterBills', this.waterBills);
    }

    return of({ transactionId, status: 'SUCCESS' });
  }

  getTransactions(phone: string, consumerId: string): Observable<Transaction[]> {
    // In a more complex app, we might search all transactions for a given phone number.
    // For this form, we'll return transactions matching both phone and the specific consumerId.
    const userTransactions = this.transactions.filter(t => t.phone === phone && t.consumerId === consumerId);
    return of(userTransactions);
  }
}
