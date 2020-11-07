import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreakpointOverlayComponent } from './breakpoint-overlay.component';

describe('BreakpointOverlayComponent', () => {
  let component: BreakpointOverlayComponent;
  let fixture: ComponentFixture<BreakpointOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BreakpointOverlayComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BreakpointOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
