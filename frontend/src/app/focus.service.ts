import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FocusService {
  private readonly $observer: BehaviorSubject<boolean>;

  constructor() {
    this.$observer = new BehaviorSubject<boolean>(true);

    document.addEventListener('visibilitychange', () => {
      this.$observer.next(document.visibilityState === 'visible');
    });

    // Safari does not emit an event for visibilityState == 'hidden'.
    // In this case we need to handle the 'pagehide' event.
    document.addEventListener('pagehide', () => this.$observer.next(false));
  }

  /**
   * Returns an observer that signals true when the window is focused
   * and false when the window is blurred.
   */
  public get observe(): Observable<boolean> {
    return this.$observer;
  }
}
