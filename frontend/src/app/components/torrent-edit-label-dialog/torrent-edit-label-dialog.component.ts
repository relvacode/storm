import {Component, Injectable} from '@angular/core';
import {DialogService, DynamicDialogConfig, DynamicDialogRef} from "primeng/dynamicdialog";
import {ApiService} from "../../api.service";
import {BehaviorSubject, combineLatest, Observable, of} from "rxjs";
import {delay, map, shareReplay, switchMap} from "rxjs/operators";

interface LabelSuggestion {
  value: string;
  new: boolean;
  clear: boolean;
}

@Component({
  selector: 't-torrent-edit-label-dialog',
  templateUrl: './torrent-edit-label-dialog.component.html',
  styleUrls: ['./torrent-edit-label-dialog.component.scss']
})
export class TorrentEditLabelDialogComponent {
  id: string
  label: LabelSuggestion;

  query$ = new BehaviorSubject<string>('');
  labels$: Observable<string[]>;
  suggestions$: Observable<LabelSuggestion[]>;

  constructor(private ref: DynamicDialogRef, private config: DynamicDialogConfig, private api: ApiService) {
    this.id = config.data.id;
    this.label = {
      value: config.data.currentLabel ? config.data.currentLabel : '',
      new: false,
      clear: !config.data.currentLabel,
    };

    this.labels$ = this.api.labels().pipe(
      shareReplay(1)
    )

    this.suggestions$ = combineLatest([this.labels$, this.query$]).pipe(
      map(([labels, query]) => {
        const suggestions: LabelSuggestion[] = [];
        const preparedQuery = query.toLocaleLowerCase();

        let hasExactMatch = false;
        for (const label of labels) {
          if (!preparedQuery || label.includes(preparedQuery)) {
            suggestions.push({value: label, new: false, clear:false})
          }

          if (label === preparedQuery) {
            hasExactMatch = true
          }
        }

        if (preparedQuery && !hasExactMatch) {
          suggestions.push({value: preparedQuery, new: true, clear: false})
        }

        if (!preparedQuery) {
          suggestions.push({value: '', new: false, clear: true})
        }

        return suggestions
      })
    )
  }

  onComplete($event: { query: string }) {
    this.query$.next($event.query)
  }

  onSubmit(): void {
    // Do nothing if the label is unchanged
    if (this.label.value === this.config.data.currentLabel) {
      this.ref.close();
      return;
    }

    let prep$: Observable<void> = of(null)

    // If the label is not empty then check it is not one of the existing labels
    if (this.label.value && this.label.new) {
      prep$ = this.api.createLabel(this.label.value).pipe(
        // Deluge has issues when a torrent label is set immediately after setting it
        delay(200)
      )
    }

    prep$.pipe(
      switchMap(_ => this.api.setTorrentLabel(this.id, {Label: this.label.value}))
    ).subscribe(
      _ => this.ref.close(this.label.value)
    )
  }

  onClose(): void {
    this.ref.close()
  }
}

@Injectable({
  providedIn: 'root',
})
export class TorrentEditLabelService {
  constructor(private dialogService: DialogService) {
  }

  public open(id: string, currentLabel?: string): Observable<string> {
    const ref = this.dialogService.open(TorrentEditLabelDialogComponent, {
      header: 'Edit Label',
      showHeader: true,
      closable: true,
      closeOnEscape: true,
      dismissableMask: true,
      styleClass: 't-dialog-responsive',
      data: {
        id,
        currentLabel,
      }
    });

    return ref.onClose.pipe(
      map(value => typeof value === 'undefined' ? currentLabel : value)
    )
  }
}
