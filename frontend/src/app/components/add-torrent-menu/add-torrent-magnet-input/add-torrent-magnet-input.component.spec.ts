import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTorrentMagnetInputComponent } from './add-torrent-magnet-input.component';

describe('AddTorrentMagnetInputComponent', () => {
  let component: AddTorrentMagnetInputComponent;
  let fixture: ComponentFixture<AddTorrentMagnetInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddTorrentMagnetInputComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddTorrentMagnetInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
