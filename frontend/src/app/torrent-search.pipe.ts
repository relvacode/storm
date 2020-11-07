import {Pipe, PipeTransform} from '@angular/core';
import {Torrent} from './api.service';

@Pipe({
  name: 'torrentSearch'
})
export class TorrentSearchPipe implements PipeTransform {

  private filter(term: string): (t: Torrent) => boolean {
    return (t: Torrent): boolean => {

      switch (true) {
        case t.Name.toLowerCase().includes(term):
          return true;
        case t.State.toLowerCase().includes(term):
          return true;
        case t.DownloadLocation.toLowerCase().includes(term):
          return true;
        case t.TrackerHost.toLowerCase().includes(term):
          return true;
      }

      return false;
    };
  }

  transform<T extends Torrent>(values: Array<T>, term: string): Array<T> {
    if (!values || !Array.isArray(values) || !term) {
      return values;
    }

    const predicate = this.filter(term.toLowerCase());
    return values.filter(predicate);
  }

}
