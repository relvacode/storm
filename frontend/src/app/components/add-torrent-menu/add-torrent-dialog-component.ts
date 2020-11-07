import {AddTorrent, AddTorrentRequest, ApiException, ApiService, TorrentOptions} from '../../api.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import {Injector} from '@angular/core';
import {catchError, finalize} from 'rxjs/operators';
import {throwError} from 'rxjs';
import {Message} from 'primeng/api';

export class AddTorrentDialogComponentDirective<T> {
  public static DefaultIcon = 'far fa-plus-square';

  public config: TorrentOptions;
  public submitIcon = AddTorrentDialogComponentDirective.DefaultIcon;
  public submitIsDisabled = false;
  public errorMessages: Message[] = [];

  api: ApiService;
  ref: DynamicDialogRef;
  data: Partial<T>;

  constructor(injector: Injector) {
    this.api = injector.get(ApiService) as ApiService;
    this.ref = injector.get(DynamicDialogRef) as DynamicDialogRef;
    this.data = (injector.get(DynamicDialogConfig) as DynamicDialogConfig).data;
    this.config = {};
  }

  public close(): void {
    this.ref.close(false);
  }

  public submit(opt: AddTorrent): void {
    const req: AddTorrentRequest = Object.assign({Options: this.config}, opt);

    this.submitIcon = 'fa-spin fas fa-spinner';
    this.submitIsDisabled = true;
    this.errorMessages.splice(0);

    this.api.add(req).pipe(
      catchError((err: ApiException) => {
        // Catch Api exceptions and push them to the messages stack
        this.errorMessages = [err.message];
        return throwError(err);

      }),
      finalize(() => {
        this.submitIcon = AddTorrentDialogComponentDirective.DefaultIcon;
        this.submitIsDisabled = false;
      })
    ).subscribe(
      response => this.ref.close(response.ID)
    );
  }
}
