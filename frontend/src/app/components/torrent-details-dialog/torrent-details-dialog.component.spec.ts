import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorrentDetailsDialogComponent } from './torrent-details-dialog.component';

describe('TorrentDetailsDialogComponent', () => {
  let component: TorrentDetailsDialogComponent;
  let fixture: ComponentFixture<TorrentDetailsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorrentDetailsDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TorrentDetailsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
