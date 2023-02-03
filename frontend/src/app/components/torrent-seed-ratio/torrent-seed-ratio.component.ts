import {Component, Input} from '@angular/core';

@Component({
  selector: 't-torrent-seed-ratio',
  templateUrl: './torrent-seed-ratio.component.html',
  styleUrls: ['./torrent-seed-ratio.component.scss']
})
export class TorrentSeedRatioComponent {
  @Input() ratio: number;
  constructor() { }
}
