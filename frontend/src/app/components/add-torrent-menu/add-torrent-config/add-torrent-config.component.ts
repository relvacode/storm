import {Component, Input} from '@angular/core';
import {TorrentOptions} from '../../../api.service';

@Component({
  selector: 't-add-torrent-config',
  templateUrl: './add-torrent-config.component.html',
  styleUrls: ['./add-torrent-config.component.scss']
})
export class AddTorrentConfigComponent {
  @Input('config') config: TorrentOptions;

  constructor() {
  }

  public unsetFields($event: boolean, ...fields: (keyof TorrentOptions)[]): void {
    if (!$event) {
      for (const field of fields) {
        // @ts-ignore
        this.config[field] = null;
      }
    }
  }
}
