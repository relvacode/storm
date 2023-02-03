import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorrentSeedRatioComponent } from './torrent-seed-ratio.component';

describe('TorrentSeedRatioComponent', () => {
  let component: TorrentSeedRatioComponent;
  let fixture: ComponentFixture<TorrentSeedRatioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorrentSeedRatioComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TorrentSeedRatioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
