import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTorrentFileInputComponent } from './add-torrent-file-input.component';

describe('AddTorrentFileInputComponent', () => {
  let component: AddTorrentFileInputComponent;
  let fixture: ComponentFixture<AddTorrentFileInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddTorrentFileInputComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddTorrentFileInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
