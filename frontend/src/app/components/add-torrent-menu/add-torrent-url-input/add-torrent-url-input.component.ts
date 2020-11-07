import {Component, Injector} from '@angular/core';
import {AddTorrentDialogComponentDirective} from '../add-torrent-dialog-component';

export interface URLInput {
  url: string;
}

@Component({
  selector: 't-add-torrent-url-input',
  templateUrl: './add-torrent-url-input.component.html',
  styleUrls: ['./add-torrent-url-input.component.scss']
})
export class AddTorrentUrlInputComponent extends AddTorrentDialogComponentDirective<URLInput> {
  url: string;

  constructor(injector: Injector) {
    super(injector);
    this.url = this.data.url;
  }

  onSubmit(): void {
    this.submit({Type: 'url', URI: this.url});
  }
}
