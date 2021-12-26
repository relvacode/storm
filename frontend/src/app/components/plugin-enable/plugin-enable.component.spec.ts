import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PluginEnableComponent } from './plugin-enable.component';

describe('PluginEnableComponent', () => {
  let component: PluginEnableComponent;
  let fixture: ComponentFixture<PluginEnableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PluginEnableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PluginEnableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
