import {Component, EventEmitter, Output} from '@angular/core';
import {AddTorrentMagnetInputComponent} from '../add-torrent-menu/add-torrent-magnet-input/add-torrent-magnet-input.component';
import {AddTorrentUrlInputComponent} from '../add-torrent-menu/add-torrent-url-input/add-torrent-url-input.component';
import {DialogService} from 'primeng/dynamicdialog';


interface CT {
  type: any;
  icon: string;
}

const EntryComponents: { [k: string]: CT | undefined } = {
  search: undefined,
  magnet: {
    type: AddTorrentMagnetInputComponent,
    icon: 'fas fa-magnet',
  },
  url: {
    type: AddTorrentUrlInputComponent,
    icon: 'fas fa-link'
  },
};

@Component({
  selector: 't-torrent-search',
  templateUrl: './torrent-search.component.html',
  styleUrls: ['./torrent-search.component.scss']
})
export class TorrentSearchComponent {
  @Output('search') search = new EventEmitter<string>();

  searchText: string;
  icon: string;
  mode: keyof typeof EntryComponents = 'search';


  constructor(private dialogService: DialogService) {
  }


  private setTarget(target: keyof typeof EntryComponents): void {
    if (target === this.mode) {
      return;
    }

    if (target === 'search') {
      this.mode = 'search';
      this.icon = null;
      return;
    }

    // Otherwise this is a target url

    if (this.mode === 'search') {
      this.search.emit('');
    }

    this.mode = target;
    this.icon = EntryComponents[target].icon;
  }

  onClear(): void {
    this.mode = 'search';
    this.icon = null;
    this.searchText = '';
    this.search.emit('');
  }

  onChange($event: string): void {
    switch (true) {
      case $event.startsWith('magnet:'):
        this.setTarget('magnet');
        break;
      case $event.startsWith('http://') || $event.startsWith('https://'):
        this.setTarget('url');
        break;
      default:
        this.setTarget('search');
        this.search.emit(this.searchText);
    }
  }

  onAdd(): void {
    const component = EntryComponents[this.mode];
    const ref = this.dialogService.open(component.type, {
      showHeader: false,
      closable: true,
      closeOnEscape: true,
      dismissableMask: true,
      styleClass: 't-dialog-responsive',
      data: {
        url: this.searchText
      }
    });

    // When the modal is closed, if the modal
    // produces a non-nil result (a valid torrent hash)
    ref.onClose.subscribe(
      result => {
        if (!!result) {
          this.onClear();
        }
      }
    );
  }

}
