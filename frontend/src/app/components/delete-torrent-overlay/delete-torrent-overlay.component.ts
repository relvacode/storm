import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {ApiService} from '../../api.service';
import {OverlayPanel} from 'primeng/overlaypanel';
import {finalize, mergeMap} from 'rxjs/operators';
import {from} from 'rxjs';

@Component({
  selector: 't-delete-torrent-overlay',
  templateUrl: './delete-torrent-overlay.component.html',
  styleUrls: ['./delete-torrent-overlay.component.scss']
})
export class DeleteTorrentOverlayComponent {
  @Input('torrents') torrents: string[];
  @Output('removed') removed = new EventEmitter<boolean>();


  @ViewChild('overlay') overlay: OverlayPanel;


  processing = false;

  constructor(private api: ApiService) {
  }

  public toggle($event): void {
    this.overlay.toggle($event, $event.target);
  }

  onRemove(withData: boolean): void {
    this.processing = true;

    from(this.torrents).pipe(
      mergeMap(hash => this.api.removeTorrent(withData, hash)),
      finalize(() => {
        this.processing = false;
        this.overlay.hide();
        this.removed.emit(true);
      })
    ).subscribe(
      _ => console.log('torrent deleted'),
    );
  }
}
