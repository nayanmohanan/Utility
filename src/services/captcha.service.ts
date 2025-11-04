import { Injectable, signal } from '@angular/core';

export interface CaptchaChallenge {
  question: string;
  answer: number;
}

@Injectable({
  providedIn: 'root'
})
export class CaptchaService {
  challenge = signal<CaptchaChallenge>(this.generateChallenge());

  generateChallenge(): CaptchaChallenge {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return {
      question: `What is ${num1} + ${num2}?`,
      answer: num1 + num2
    };
  }
  
  refresh() {
    this.challenge.set(this.generateChallenge());
  }

  verify(answer: string | null | undefined): boolean {
    if (!answer) return false;
    return parseInt(answer, 10) === this.challenge().answer;
  }
}
