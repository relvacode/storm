import {Component, Injector} from '@angular/core';
import {AddTorrentDialogComponentDirective} from '../add-torrent-dialog-component';

@Component({
  selector: 't-add-torrent-file-input',
  templateUrl: './add-torrent-file-input.component.html',
  styleUrls: ['./add-torrent-file-input.component.scss']
})
export class AddTorrentFileInputComponent extends AddTorrentDialogComponentDirective<null> {
  constructor(injector: Injector) {
    super(injector);
  }

  /**
   * Converts an array buffer to a Base64 encoded string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  onResetErrors(): void {
    this.errorMessages = [];
  }

  onSubmit($event: { files: Array<File> }): void {
    const file = $event.files[0];

    file.arrayBuffer().then(
      buffer => {
        // Encode the file as Base64 and submit to the server
        const encoded = this.arrayBufferToBase64(buffer);
        this.submit({
          Type: 'file',
          URI: file.name,
          Data: encoded,
        });
      },
      err => {
        this.errorMessages = [{
          severity: 'error',
          summary: 'Error',
          detail: err.toString(),
        }];
      }
    );
  }
}
