import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorrentStateComponent } from './torrent-state.component';

describe('TorrentStateComponent', () => {
  let component: TorrentStateComponent;
  let fixture: ComponentFixture<TorrentStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorrentStateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TorrentStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
