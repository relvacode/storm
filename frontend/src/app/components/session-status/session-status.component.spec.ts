import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionStatusComponent } from './session-status.component';

describe('SessionStatusComponent', () => {
  let component: SessionStatusComponent;
  let fixture: ComponentFixture<SessionStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SessionStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SessionStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
