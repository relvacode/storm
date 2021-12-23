import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorrentLabelComponent } from './torrent-label.component';

describe('TorrentLabelComponent', () => {
  let component: TorrentLabelComponent;
  let fixture: ComponentFixture<TorrentLabelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorrentLabelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TorrentLabelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
