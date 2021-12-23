import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityMarkerComponent } from './activity-marker.component';

describe('ActivityMarkerComponent', () => {
  let component: ActivityMarkerComponent;
  let fixture: ComponentFixture<ActivityMarkerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityMarkerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
