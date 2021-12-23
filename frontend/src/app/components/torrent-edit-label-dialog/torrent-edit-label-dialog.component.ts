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
  label: string;
  initialLabel: string;

  query$ = new BehaviorSubject<string>('');
  refresh$ = new BehaviorSubject<void>(null);
  labels$: Observable<string[]>;
  suggestions$: Observable<LabelSuggestion[]>;

  constructor(private ref: DynamicDialogRef, config: DynamicDialogConfig, private api: ApiService) {
    this.id = config.data.id;
    this.label = '';
    this.initialLabel = config.data.currentLabel ? config.data.currentLabel : '';

    this.labels$ = this.refresh$.pipe(
      switchMap(_ => this.api.labels()),
      shareReplay(1)
    );

    this.suggestions$ = combineLatest([this.labels$, this.query$]).pipe(
      map(([labels, query]) => {
        const suggestions: LabelSuggestion[] = [];
        const preparedQuery = query.toLocaleLowerCase();

        let hasExactMatch = false;
        for (const label of labels) {

          // Don't suggest the initial label
          if (!!this.initialLabel && preparedQuery === this.initialLabel) {
            hasExactMatch = true;
            continue
          }

          // Suggest an existing label if it partially matches
          if (!preparedQuery || label.includes(preparedQuery)) {
            // Only suggest this label if there was no initial label, or if this label does not match the initial
            if (this.initialLabel === '' || label !== this.initialLabel) {
              suggestions.push({value: label, new: false, clear: false})
            }
          }

          if (label === preparedQuery) {
            hasExactMatch = true
          }
        }

        // If there is a query to suggest, and there's no exact match then suggest creating a new label
        if (preparedQuery && !hasExactMatch) {
          suggestions.push({value: preparedQuery, new: true, clear: false})
        }

        // If there was an initial label, then suggest clearing it
        if (!!this.initialLabel) {
          suggestions.push({value: '', new: false, clear: true})
        }

        return suggestions
      })
    )
  }

  onDeleteLabel($event: { preventDefault: () => void }, name: string): void {
    $event.preventDefault();

    this.api.deleteLabel(name).subscribe(
      _ => {
        if (name === this.label) {
          this.label = '';
        }

        this.refresh$.next(null)
      }
    )
  }

  onComplete($event: { query: string }) {
    this.query$.next($event.query)
  }

  onApplySuggestion(suggestion: LabelSuggestion): void {
    // Do nothing if the label is unchanged
    if (suggestion.value === this.initialLabel && !suggestion.new) {
      this.ref.close();
      return;
    }

    let prep$: Observable<void> = of(null)

    // If the label is not empty then check it is not one of the existing labels
    if (suggestion.value && suggestion.new) {
      prep$ = this.api.createLabel(suggestion.value).pipe(
        // Deluge has issues when a torrent label is set immediately after setting it
        delay(200)
      )
    }

    prep$.pipe(
      switchMap(_ => this.api.setTorrentLabel(this.id, {Label: suggestion.value}))
    ).subscribe(
      _ => this.ref.close(suggestion.value)
    )
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
