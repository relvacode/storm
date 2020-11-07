import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTorrentConfigComponent } from './add-torrent-config.component';

describe('AddTorrentConfigComponent', () => {
  let component: AddTorrentConfigComponent;
  let fixture: ComponentFixture<AddTorrentConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddTorrentConfigComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddTorrentConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
