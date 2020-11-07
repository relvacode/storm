import {Injectable} from '@angular/core';
import {Observable, ObservableInput, throwError} from 'rxjs';
import {HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpParams, HttpRequest} from '@angular/common/http';
import {catchError} from 'rxjs/operators';
import {Message} from 'primeng/api';
import {environment} from '../environments/environment';

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

export type State = 'Active' | 'Allocating' | 'Checking' | 'Downloading' | 'Seeding' | 'Paused' | 'Error' | 'Queued' | 'Moving';

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

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {
  }

  private url(endpoint: string): string {
    return `${environment.baseUrl}${endpoint}`;
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

    return this.http.post<void>(this.url('/torrents/pause'), null, {
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

    return this.http.post<void>(this.url('/torrents/resume'), null, {
      params
    });
  }

  /**
   * Get a specific torrent by ID
   * @param id
   * The torrent ID
   */
  public torrent(id: string): Observable<Torrent> {
    return this.http.get<Torrent>(this.url(`/torrent/${id}`));
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

    return this.http.get<Torrents>(this.url('/torrents'), {
      params,
    });
  }

  public removeTorrent(withData: boolean, id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/torrent/${id}`), {
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
    return this.http.post<AddTorrentResponse>(this.url('/torrents'), req);
  }
}
