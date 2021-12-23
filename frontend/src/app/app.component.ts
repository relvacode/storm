import {Component, OnInit} from '@angular/core';
import {BehaviorSubject, combineLatest, EMPTY, forkJoin, Observable, of, timer} from 'rxjs';
import {catchError, filter, map, mergeMap, switchMap, tap} from 'rxjs/operators';
import {ApiService, State, Torrent, TorrentLabels, Torrents} from './api.service';
import {SelectItem} from 'primeng/api';
import {FocusService} from './focus.service';
import {DialogService} from "primeng/dynamicdialog";
import {PluginEnableComponent} from "./components/plugin-enable/plugin-enable.component";

type OptionalState = State | null;

interface HashedTorrent extends LabelledTorrent {
  hash: string;
  label: string;
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

  filterLabelsOptions: SelectItem<string>[] = [];
  filterByLabel: string[] = [];

  searchText: string;

  // All torrent hashes within the current view
  hashesInView: string[];
  // Current view is empty
  empty = false;
  stateInView: OptionalState;

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

    return ref.onClose
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
          return of(true)
        }

        return this.enableLabelPlugin()
      })
    )

    const interval$ = combineLatest([timer$, this.focus.observe, this.get$, labelPluginEnabled$]);

    interval$.pipe(
      // Continue only when in focus
      filter(([_, focus, state, pluginEnabled]) => focus),

      // Switch to API response of torrents
      mergeMap(([_, focus, state]) => {
        const torrents$ = this.api.torrents(state).pipe(
          catchError(() => {
            this.connected = false;
            return EMPTY;
          }),
        )

        const labels$ = this.api.torrentsLabels(state)

        return forkJoin({
          torrents: torrents$,
          labels: labels$,
        })
      }),

      // Tap view information
      tap(response => this.empty = !this.tapEmptyView(response.torrents)),
      tap(response => this.stateInView = this.tapStateInView(response.torrents)),
      tap(response => this.hashesInView = this.tapHashesInView(response.torrents)),
      tap(response => this.filterLabelsOptions = this.tapTorrentLabelsInView(response.labels)),

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
   * Transforms the mapping of torrent to labels into a distinct set of select options
   * @param response
   * Mapping of torrent labels in view
   * @private
   */
  private tapTorrentLabelsInView(response: TorrentLabels): SelectItem<string>[] {
    const labels = new Set<string>();
    for (const label of Object.values(response)) {
      labels.add(label)
    }

    const selectOptions: SelectItem<string>[] = [
      {
        title: 'Any',
        value: ''
      }
    ];

    for (const label of labels.values()) {
      selectOptions.push({
        title: label,
        value: label,
      })
    }

    return selectOptions
  }

  /**
   * Transforms an API hash-map of torrents to an array of HashedTorrent
   * @param response
   * Response from API
   */
  private transformResponse(response: { torrents: Torrents, labels: TorrentLabels }): HashedTorrent[] {
    return Object.entries(response.torrents).map(
      ([key, value]) => <HashedTorrent>Object.assign({hash: key, label: response.labels[key] || ''}, value)
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
