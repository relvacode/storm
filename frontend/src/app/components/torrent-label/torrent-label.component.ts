import {Component, Input} from '@angular/core';
import {TorrentEditLabelService} from "../torrent-edit-label-dialog/torrent-edit-label-dialog.component";

@Component({
  selector: 't-torrent-label',
  templateUrl: './torrent-label.component.html',
  styleUrls: ['./torrent-label.component.scss']
})
export class TorrentLabelComponent {
  @Input('hash') hash: string;
  @Input('label') label: string;

  constructor(private editLabelService: TorrentEditLabelService) { }

  onUpdateLabel(): void {
    this.editLabelService.open(this.hash, this.label).subscribe(
      newLabel => this.label = newLabel
    )
  }
}
