import {Component, Input} from '@angular/core';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 't-breakpoint-overlay',
  templateUrl: './breakpoint-overlay.component.html',
  styleUrls: ['./breakpoint-overlay.component.scss']
})
export class BreakpointOverlayComponent {
  @Input('icon') icon: string;
  @Input('styleClass') styleClass: string;
  @Input('contentActivated') contentActivated = false;

  $breakpoint: Observable<boolean>;

  constructor(breakpointObserver: BreakpointObserver) {
    // Breakpoint observable to switch the view to small handset view
    this.$breakpoint = breakpointObserver.observe(
      [Breakpoints.Small, Breakpoints.HandsetPortrait]
    ).pipe(
      map(state => state.matches)
    );
  }

}
