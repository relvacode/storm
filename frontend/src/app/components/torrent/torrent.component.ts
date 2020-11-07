import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ApiService, Torrent} from '../../api.service';
import {Observable} from 'rxjs';
import {switchMap, take} from 'rxjs/operators';

@Component({
  selector: 't-torrent',
  templateUrl: './torrent.component.html',
  styleUrls: ['./torrent.component.scss']
})
export class TorrentComponent implements OnInit {
  @Input('hash') hash: string;
  @Input('torrent') torrent: Torrent;
  @Output('removed') removed = new EventEmitter<boolean>();

  constructor(private api: ApiService) {
  }

  ngOnInit(): void {
  }

  private refreshAfter(action: Observable<any>): void {
    action.pipe(
      switchMap(_ => this.api.torrent(this.hash)),
      take(1),
    ).subscribe(
      torrent => this.torrent = torrent
    );
  }

  public onPause(): void {
    this.refreshAfter(this.api.pause(this.hash));
  }

  public onResume(): void {
    this.refreshAfter(this.api.resume(this.hash));
  }

  public onChangeState(): void {
    if (this.torrent.State === 'Paused') {
      this.onResume();
      return;
    }

    this.onPause();
  }
}
