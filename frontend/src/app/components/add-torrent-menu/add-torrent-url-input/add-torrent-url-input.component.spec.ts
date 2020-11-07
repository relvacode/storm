import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTorrentUrlInputComponent } from './add-torrent-url-input.component';

describe('AddTorrentUrlInputComponent', () => {
  let component: AddTorrentUrlInputComponent;
  let fixture: ComponentFixture<AddTorrentUrlInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddTorrentUrlInputComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddTorrentUrlInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
