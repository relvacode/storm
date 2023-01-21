import {Inject, Injectable} from '@angular/core';
import {defer, Observable, ObservableInput, throwError} from 'rxjs';
import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpParams,
  HttpRequest
} from '@angular/common/http';
import {catchError, retryWhen, switchMap, takeWhile} from 'rxjs/operators';
import {Message} from 'primeng/api';
import {Environment, ENVIRONMENT} from "./environment";
import {DialogService} from "primeng/dynamicdialog";
import {ApiKeyDialogComponent} from "./components/api-key-dialog/api-key-dialog.component";

/**
 * Raised when the API returns an error
 */
export class ApiException {
  constructor(public status: number, public error: string) {
  }

  /**
   * Get a PrimeNG error block for this exception
   */
  public get message(): Message {
    return {
      severity: 'error',
      summary: 'Error',
      detail: this.error,
    };
  }
}

export type State =
  'Active'
  | 'Allocating'
  | 'Checking'
  | 'Downloading'
  | 'Seeding'
  | 'Paused'
  | 'Error'
  | 'Queued'
  | 'Moving';

export interface Torrent {
  ActiveTime: number;
  CompletedTime: number;
  TimeAdded: number; // most times an integer
  DistributedCopies: number;
  ETA: number; // most times an integer
  Progress: number; // max is 100
  Ratio: number;
  IsFinished: boolean;
  IsSeed: boolean;
  Private: boolean;
  DownloadLocation: string;
  DownloadPayloadRate: number;
  Name: string;
  NextAnnounce: number;
  NumPeers: number;
  NumPieces: number;
  NumSeeds: number;
  PieceLength: number;
  SeedingTime: number;
  State: State;
  TotalDone: number;
  TotalPeers: number;
  TotalSeeds: number;
  TotalSize: number;
  TrackerHost: string;
  TrackerStatus: string;
  UploadPayloadRate: number;
  Label: string;

// Files:         []File
// Peers:         []Peer
  FilePriorities: number[];
  FileProgress: number[];
}

export interface Torrents {
  [id: string]: Torrent;
}

export interface TorrentOptions {
  MaxConnections?: number;
  MaxUploadSlots?: number;
  MaxUploadSpeed?: number;
  MaxDownloadSpeed?: number;
  PrioritizeFirstLastPieces?: boolean;
  PreAllocateStorage?: boolean; // compact_allocation for v1
  DownloadLocation?: string;
  AutoManaged?: boolean;
  StopAtRatio?: boolean;
  StopRatio?: number;
  RemoveAtRatio?: number;
  MoveCompleted?: boolean;
  MoveCompletedPath?: string;
  AddPaused?: boolean;
}

export interface AddTorrent {
  Type: 'url' | 'magnet' | 'file';
  URI: string;
  Data?: string;
}

export interface AddTorrentRequest extends AddTorrent {
  Options?: TorrentOptions;
}

export interface AddTorrentResponse {
  ID: string;
}

export interface TorrentLabels {
  [id: string]: string;
}

export interface SetTorrentLabelRequest {
  Label: string;
}

export class ApiInterceptor implements HttpInterceptor {
  constructor() {
  }

  private catchError(err: HttpErrorResponse, caught: Observable<HttpEvent<any>>): ObservableInput<any> {
    return throwError(new ApiException(err.status, err.error.Error));
  }

  public intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError(this.catchError)
    );
  }
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  ask$: Observable<void>;

  constructor(dialogService: DialogService) {
    this.ask$ = defer(() => {
      const ref = dialogService.open(ApiKeyDialogComponent, {
        header: 'Authorization Required',
        showHeader: true,
        closeOnEscape: false,
        closable: false,
      })

      return ref.onClose
    });
  }

  public intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      // Catch 401 errors and ask for the API key.
      // Redo the request with the provided API key in basic auth headers
      catchError((err: ApiException) => {
        if (err.status != 401) {
          return throwError(err)
        }

        return this.ask$.pipe(
          switchMap(key => {
            const withAuthHeaderReq = req.clone({
              headers: req.headers.set('Authorization', 'Basic ' + btoa(':' + key))
            });

            return next.handle(withAuthHeaderReq)
          })
        )
      }),

      // Keep retrying 401 errors
      retryWhen(errors => errors.pipe(
        takeWhile((err: ApiException) => err.status === 401)
      ))
    )
  }
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient, @Inject(ENVIRONMENT) private environment: Environment) {
  }

  private url(endpoint: string): string {
    return `${this.environment.baseApiPath}${endpoint}`;
  }

  /**
   * Calls the ping endpoint
   */
  public ping(): Observable<void> {
    return this.http.get<void>(this.url('ping'))
  }

  /**
   * Get a list of all the currently enabled plugins
   */
  public plugins(): Observable<string[]> {
    return this.http.get<string[]>(this.url('plugins'))
  }

  /**
   * Enable a plugin
   * @param name
   * The plugin name to enable
   */
  public enablePlugin(name: string): Observable<void> {
    return this.http.post<void>(this.url(`plugins/${name}`), null)
  }

  /**
   * Disable a plugin
   * @param name
   * The plugin name to disable
   */
  public disablePlugin(name: string): Observable<void> {
    return this.http.delete<void>(this.url(`plugins/${name}`))
  }

  /**
   * Pauses one or more torrens
   * @param torrents
   * List of torrent IDs
   */
  public pause(...torrents: string[]): Observable<void> {
    const params = new HttpParams({
      fromObject: {
        id: torrents,
      }
    });

    return this.http.post<void>(this.url('torrents/pause'), null, {
      params
    });
  }

  /**
   * Resumes one or more torrens
   * @param torrents
   * List of torrent IDs
   */
  public resume(...torrents: string[]): Observable<void> {
    const params = new HttpParams({
      fromObject: {
        id: torrents,
      }
    });

    return this.http.post<void>(this.url('torrents/resume'), null, {
      params
    });
  }

  /**
   * Get a specific torrent by ID
   * @param id
   * The torrent ID
   */
  public torrent(id: string): Observable<Torrent> {
    return this.http.get<Torrent>(this.url(`torrent/${id}`));
  }


  public torrents(state?: State, ...torrents: string[]): Observable<Torrents> {
    let params = new HttpParams();
    if (!!state) {
      params = params.set('state', state);
    }
    if (!!torrents && torrents.length) {
      for (const id of torrents) {
        params = params.append('id', id);
      }
    }

    return this.http.get<Torrents>(this.url('torrents'), {
      params,
    });
  }

  public removeTorrent(withData: boolean, id: string): Observable<void> {
    return this.http.delete<void>(this.url(`torrent/${id}`), {
      params: new HttpParams({
        fromObject: {
          files: withData ? 'true' : 'false'
        }
      })
    });
  }

  /**
   * Add a new torrent
   * @param req
   * Add torrent request
   */
  public add(req: AddTorrentRequest): Observable<AddTorrentResponse> {
    return this.http.post<AddTorrentResponse>(this.url('torrents'), req);
  }

  /**
   * Gets available labels
   */
  public labels(): Observable<string[]> {
    return this.http.get<string[]>(this.url('labels'))
  }

  /**
   * Create a new label
   * @param name
   * The label name
   */
  public createLabel(name: string): Observable<void> {
    return this.http.post<void>(this.url(`labels/${name}`), null)
  }

  /**
   * Delete an existing label
   * @param name
   * The label name
   */
  public deleteLabel(name: string): Observable<void> {
    return this.http.delete<void>(this.url(`labels/${name}`))
  }

  /**
   * Gets labels associated with torrents matching filter
   * @param state
   * The torrent state
   * @param torrents
   * An optional set of torrent IDs
   */
  public torrentsLabels(state?: State, ...torrents: string[]): Observable<TorrentLabels> {
    return this.http.get<TorrentLabels>(this.url('torrents/labels'))
  }

  /**
   * Updates the label of a torrent
   * @param id
   * The torrent ID
   * @param req
   * Request data
   */
  public setTorrentLabel(id: string, req: SetTorrentLabelRequest): Observable<void> {
    return this.http.post<void>(this.url(`torrent/${id}/label`), req)
  }
}
