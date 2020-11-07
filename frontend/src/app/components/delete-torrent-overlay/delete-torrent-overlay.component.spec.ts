import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteTorrentOverlayComponent } from './delete-torrent-overlay.component';

describe('DeleteTorrentOverlayComponent', () => {
  let component: DeleteTorrentOverlayComponent;
  let fixture: ComponentFixture<DeleteTorrentOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeleteTorrentOverlayComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteTorrentOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
