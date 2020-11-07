import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {concat, Observable, of, Subject, timer} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';

@Component({
  selector: 't-connectivity-status',
  templateUrl: './connectivity-status.component.html',
  styleUrls: ['./connectivity-status.component.scss']
})
export class ConnectivityStatusComponent implements OnChanges {
  @Input('connected') connected: boolean;

  $connected: Subject<boolean>;
  $visible: Observable<boolean>;

  animate = false;
  closing = false;

  constructor() {
    this.$connected = new Subject<boolean>();
    this.$visible = this.$connected.pipe(
      tap(_ => {
        this.animate = false;
        this.closing = false;
      }),
      switchMap(ok => {
        if (!ok) {
          // If not connected then make the status visible
          return of(true);
        }

        // Otherwise, if connected
        // Make the status visible, then after 2 seconds disable the visibility
        return concat(
          of(true),
          // After two seconds begin the transition
          timer(2000, 0).pipe(
            switchMap(_ => {
              this.animate = true;
              this.closing = true;
              return timer(1000, 0).pipe(
                map(_ => false)
              );
            })
          )
        );
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    const connectedChange = changes.connected;

    // Connectivity change not made in this cycle
    if (typeof connectedChange === 'undefined') {
      return;
    }

    if (connectedChange.currentValue === true && connectedChange.isFirstChange()) {
      // Not interested in a successful initial connection
      return;
    }

    this.$connected.next(connectedChange.currentValue);
  }
}
