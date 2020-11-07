import {Component, ViewChild} from '@angular/core';
import {MenuItem} from 'primeng/api';
import {Menu} from 'primeng/menu';
import {DialogService} from 'primeng/dynamicdialog';
import {AddTorrentMagnetInputComponent} from './add-torrent-magnet-input/add-torrent-magnet-input.component';
import {AddTorrentUrlInputComponent} from './add-torrent-url-input/add-torrent-url-input.component';
import {AddTorrentFileInputComponent} from './add-torrent-file-input/add-torrent-file-input.component';

@Component({
  selector: 't-add-torrent-menu',
  templateUrl: './add-torrent-menu.component.html',
  styleUrls: ['./add-torrent-menu.component.scss'],
})
export class AddTorrentMenuComponent {
  @ViewChild('menu') menu: Menu;

  items: MenuItem[] = [
    {
      label: 'Add Torrent',
      items: [
        {
          label: 'Magnet',
          icon: 'fas fa-magnet',
          command: () => this.openDialog(AddTorrentMagnetInputComponent)
        },
        {
          label: 'URL',
          icon: 'fas fa-link',
          command: () => this.openDialog(AddTorrentUrlInputComponent)
        },
        {
          label: 'File',
          icon: 'far fa-file-alt',
          command: () => this.openDialog(AddTorrentFileInputComponent)
        }
      ]
    }
  ];


  constructor(private dialogService: DialogService) {
  }

  public toggle($event): void {
    this.menu.toggle($event);
  }

  private openDialog(component: any): void {
    this.dialogService.open(component, {
      showHeader: false,
      closable: true,
      closeOnEscape: true,
      dismissableMask: true,
      styleClass: 't-dialog-responsive'
    });
  }

}
