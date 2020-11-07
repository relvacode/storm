import {Component, OnInit} from '@angular/core';
import {BehaviorSubject, combineLatest, EMPTY, Observable, of, throwError, timer} from 'rxjs';
import {catchError, filter, map, mergeMap, onErrorResumeNext, retry, switchMap, tap} from 'rxjs/operators';
import {ApiService, State, Torrent, Torrents} from './api.service';
import {SelectItem} from 'primeng/api';
import {FocusService} from './focus.service';


type OptionalState = State | null;

interface HashedTorrent extends Torrent {
  hash: string;
}


@Component({
  selector: 't-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  sortByField: keyof Torrent = null;

  sortOptions: SelectItem<keyof Torrent>[] = [
    {
      label: 'State',
      value: 'State'
    },
    {
      label: 'Added',
      value: 'TimeAdded'
    },
    {
      label: 'Progress',
      value: 'Progress'
    },
    {
      label: 'ETA',
      value: 'ETA'
    },
    {
      label: 'Name',
      value: 'Name'
    },
    {
      label: 'Size',
      value: 'TotalSize'
    },
    {
      label: 'Ratio',
      value: 'Ratio'
    }
  ];

  filterStatesOptions: SelectItem<OptionalState>[] = [
    {
      label: 'All',
      value: null,
    },
    {
      label: 'Downloading',
      value: 'Downloading',
    },
    {
      label: 'Queued',
      value: 'Queued',
    },
    {
      label: 'Paused',
      value: 'Paused'
    },
    {
      label: 'Error',
      value: 'Error'
    }
  ];

  searchText: string;

  // All torrent hashes within the current view
  hashesInView: string[];
  // Current view is empty
  empty = false;
  stateInView: OptionalState;

  torrents: HashedTorrent[];

  connected = true;

  $get: BehaviorSubject<OptionalState>;

  constructor(private api: ApiService, private focus: FocusService) {
    this.$get = new BehaviorSubject<OptionalState>(null);
    this.refreshInterval(2000);
  }


  /**
   * Updates the list of torrents at every given interval,
   * or when the selected $get state is updated.
   * @param interval
   * Update interval in milliseconds
   */
  private refreshInterval(interval: number): void {
    const $timer = timer(0, interval);

    const $interval = combineLatest([$timer, this.focus.observe, this.$get]);
    $interval.pipe(
      // Continue only when in focus
      filter(([_, focus, state]) => focus),

      // Switch to API response of torrents
      mergeMap(([_, focus, state]) => this.api.torrents(state).pipe(
        catchError(() => {
          this.connected = false;
          return EMPTY;
        }),
      )),

      // Tap view information
      tap(response => this.empty = !this.tapEmptyView(response)),
      tap(response => this.stateInView = this.tapStateInView(response)),
      tap(response => this.hashesInView = this.tapHashesInView(response)),

      map(response => this.transformResponse(response)),
    ).subscribe(
      response => {
        this.torrents = response;
        this.connected = true;
      }
    );
  }

  /**
   * Returns true if no torrents were returned
   * @param response
   * Response from API
   */
  private tapEmptyView(response: Torrents): boolean {
    return Object.keys(response).length > 0;
  }

  /**
   * Gets the torrent hashes from an API response
   * @param response
   * Response from API
   */
  private tapHashesInView(response: Torrents): string[] {
    return Object.keys(response);
  }

  /**
   * Gets the unique state of all torrents from an API response.
   * If there are no torrents or more than one state of the same type exists,
   * then null is returned.
   * @param response
   * Response from API
   */
  private tapStateInView(response: Torrents): OptionalState {
    let state: OptionalState = null;

    for (const torrent of Object.values(response)) {
      if (state === null) {
        state = torrent.State;
        continue;
      }

      if (state !== torrent.State) {
        return null;
      }
    }

    return state;
  }

  /**
   * Transforms an API hash-map of torrents to an array of HashedTorrent
   * @param response
   * Response from API
   */
  private transformResponse(response: Torrents): HashedTorrent[] {
    return Object.entries(response).map(
      ([key, value]) => Object.assign({hash: key}, value)
    );
  }

  public trackBy(torrent: HashedTorrent): string {
    return torrent.hash;
  }


  onToggleInView(targetState: 'pause' | 'resume', torrents: HashedTorrent[]): void {
    if (!torrents || torrents.length === 0) {
      return;
    }

    let res: Observable<void>;
    switch (targetState) {
      case 'pause':
        res = this.api.pause(...torrents.filter(t => t.State !== 'Paused').map(t => t.hash));
        break;
      case 'resume':
        res = this.api.resume(...torrents.filter(t => t.State === 'Paused').map(t => t.hash));
        break;
    }

    res.subscribe(
      _ => console.log(`torrents in view reached target state ${targetState}`)
    );
  }

  ngOnInit(): void {
  }

}
