import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IonxSearchSelect } from './ionx-search-select';

describe('IonxSearchSelect', () => {
  let component: IonxSearchSelect;
  let fixture: ComponentFixture<IonxSearchSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonxSearchSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IonxSearchSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
