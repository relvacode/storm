import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorrentComponent } from './torrent.component';

describe('TorrentComponent', () => {
  let component: TorrentComponent;
  let fixture: ComponentFixture<TorrentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorrentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TorrentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
