import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private successSound: HTMLAudioElement;

  constructor() {
    // A pleasant success sound from a reliable CDN to prevent source errors.
    this.successSound = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
    this.successSound.load(); // Preload the audio for faster playback
  }

  /**
   * Plays the payment success sound effect.
   */
  playSuccessSound(): void {
    // Resetting the sound's current time allows it to be played again even if it's already playing.
    this.successSound.currentTime = 0;
    this.successSound.play().catch(error => {
      // Autoplay can be blocked by the browser, log the error but don't crash.
      console.error("Audio playback failed:", error);
    });
  }
}
