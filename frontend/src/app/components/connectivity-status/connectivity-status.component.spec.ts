import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectivityStatusComponent } from './connectivity-status.component';

describe('ConnectivityStatusComponent', () => {
  let component: ConnectivityStatusComponent;
  let fixture: ComponentFixture<ConnectivityStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConnectivityStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectivityStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
