import {Component, Injectable} from '@angular/core';
import {Torrent} from '../../api.service';
import {Observable} from 'rxjs';
import {DialogService, DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
  selector: 't-torrent-details-dialog',
  templateUrl: './torrent-details-dialog.component.html',
  styleUrls: ['./torrent-details-dialog.component.scss']
})
export class TorrentDetailsDialogComponent {
  id: string;
  torrent: Observable<Torrent>;

  constructor(private ref: DynamicDialogRef, private config: DynamicDialogConfig) {
    this.id = config.data.id;
    this.torrent = config.data.torrent;
  }

  public onRemoved(): void {
    this.ref.close();
  }
}


@Injectable({
  providedIn: 'root',
})
export class TorrentDetailsDialogService {
  constructor(private dialogService: DialogService) {
  }

  public open(id: string, torrent: Observable<Torrent>): void {
    this.dialogService.open(TorrentDetailsDialogComponent, {
      showHeader: false,
      closable: true,
      closeOnEscape: true,
      dismissableMask: true,
      styleClass: 't-dialog-responsive',
      data: {
        id,
        torrent
      }
    });
  }
}
