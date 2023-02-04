import {Component} from '@angular/core';
import {BehaviorSubject, combineLatest, EMPTY, forkJoin, Observable, of, timer} from 'rxjs';
import {catchError, filter, mergeMap, switchMap, tap} from 'rxjs/operators';
import {ApiService, SessionStatus, State, Torrent, Torrents} from './api.service';
import {SelectItem} from 'primeng/api';
import {FocusService} from './focus.service';
import {DialogService} from 'primeng/dynamicdialog';
import {PluginEnableComponent} from './components/plugin-enable/plugin-enable.component';
import {LabelledTorrent} from './torrent-search.pipe';

type OptionalState = State | null;

interface HashedTorrent extends LabelledTorrent {
  hash: string;
}

@Component({
  selector: 't-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  sortByField: keyof Torrent = null;
  sortReverse = false;

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
    },
    {
      label: 'Seeding',
      value: 'SeedingTime'
    }
  ];

  filterStatesOptions: SelectItem<OptionalState>[] = [
    {
      label: 'All',
      value: null,
    },
    {
      label: 'Active',
      value: 'Active'
    },
    {
      label: 'Queued',
      value: 'Queued',
    },
    {
      label: 'Downloading',
      value: 'Downloading',
    },
    {
      label: 'Seeding',
      value: 'Seeding',
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
  sessionStatus: SessionStatus = {
    HasIncomingConnections: false,
    UploadRate: 0,
    DownloadRate: 0,
    PayloadUploadRate: 0,
    PayloadDownloadRate: 0,
    TotalDownload: 0,
    TotalUpload: 0,
    NumPeers: 0,
    DhtNodes: 0,
  };

  torrents: HashedTorrent[];

  connected = true;

  get$: BehaviorSubject<OptionalState>;

  constructor(private api: ApiService, private focus: FocusService, private dialogService: DialogService) {
    this.get$ = new BehaviorSubject<OptionalState>(null);
    this.refreshInterval(2000);
  }


  /**
   * Opens the PluginEnable dialog component
   * @private
   */
  private enableLabelPlugin(): Observable<void> {
    const ref = this.dialogService.open(PluginEnableComponent, {
      header: 'Enable Plugin',
      showHeader: false,
      closable: false,
      closeOnEscape: false,
      dismissableMask: false,
      styleClass: 't-dialog-responsive',
      data: {
        name: 'Label'
      }
    });

    return ref.onClose;
  }

  /**
   * Updates the list of torrents at every given interval,
   * or when the selected $get state is updated.
   * @param interval
   * Update interval in milliseconds
   */
  private refreshInterval(interval: number): void {
    const timer$ = timer(0, interval);

    // Ensure the label plugin is enabled
    const labelPluginEnabled$ = this.api.plugins().pipe(
      switchMap(plugins => {
        const ok = plugins.findIndex(name => name === 'Label') > -1;
        if (ok) {
          return of(true);
        }

        return this.enableLabelPlugin();
      })
    );

    const interval$ = combineLatest([timer$, this.focus.observe, this.get$, labelPluginEnabled$]);

    interval$.pipe(
      // Continue only when in focus
      filter(([_, focus]) => focus),

      // Switch to API response of torrents
      mergeMap(([_, focus, state]) => {
        const torrents$ = this.api.torrents(state);
        const labels$ = this.api.torrentsLabels(state);
        const session$ = this.api.sessionStatus();

        return forkJoin({
          torrents: torrents$,
          labels: labels$,
          session: session$,
        }).pipe(
          catchError(err => {
            console.error('Connection error', err);
            this.connected = false;
            return EMPTY;
          }),
        );
      }),

      // Tap view information
      tap(response => this.empty = !this.tapEmptyView(response.torrents)),
      tap(response => this.stateInView = this.tapStateInView(response.torrents)),
      tap(response => this.hashesInView = this.tapHashesInView(response.torrents)),
    ).subscribe(
      response => {
        this.connected = true;
        this.sessionStatus = response.session;
        this.torrents = Object.entries(response.torrents).map(
          ([key, value]) => Object.assign({hash: key, Label: response.labels[key] || ''}, value)
        );
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
}
