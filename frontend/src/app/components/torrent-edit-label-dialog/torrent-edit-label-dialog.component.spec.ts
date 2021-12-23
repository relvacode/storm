import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorrentEditLabelDialogComponent } from './torrent-edit-label-dialog.component';

describe('TorrentEditLabelDialogComponent', () => {
  let component: TorrentEditLabelDialogComponent;
  let fixture: ComponentFixture<TorrentEditLabelDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorrentEditLabelDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TorrentEditLabelDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
