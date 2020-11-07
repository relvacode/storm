import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTorrentMenuComponent } from './add-torrent-menu.component';

describe('AddTorrentMenuComponent', () => {
  let component: AddTorrentMenuComponent;
  let fixture: ComponentFixture<AddTorrentMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddTorrentMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddTorrentMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
