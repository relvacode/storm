import {Component, Injector} from '@angular/core';
import {AddTorrentDialogComponentDirective} from '../add-torrent-dialog-component';

export interface MagnetInput {
  url: string;
}

@Component({
  selector: 't-add-torrent-magnet-input',
  templateUrl: './add-torrent-magnet-input.component.html',
  styleUrls: ['./add-torrent-magnet-input.component.scss']
})
export class AddTorrentMagnetInputComponent extends AddTorrentDialogComponentDirective<MagnetInput> {
  url: string;

  constructor(injector: Injector) {
    super(injector);
    this.url = this.data.url;
  }

  onSubmit(): void {
    this.submit({Type: 'magnet', URI: this.url});
  }
}
