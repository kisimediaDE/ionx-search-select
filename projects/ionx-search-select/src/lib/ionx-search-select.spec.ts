import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideZonelessChangeDetection } from '@angular/core';
import { IonxSearchSelect, SelectOption } from './ionx-search-select';

/* ================================
 * Test Utilities
 * ================================ */

function makeOptions(): SelectOption<string>[] {
  return [
    { value: 'ber', label: 'Berlin' },
    { value: 'ham', label: 'Hamburg' },
    { value: 'muc', label: 'München' },
  ];
}

/* ================================
 * Standalone specs (no forms)
 * ================================ */

describe('IonxSearchSelect (standalone, state-based)', () => {
  let fixture: ComponentFixture<IonxSearchSelect<string>>;
  let cmp: IonxSearchSelect<string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonxSearchSelect],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(IonxSearchSelect<string>);
    cmp = fixture.componentInstance;

    // Initial inputs
    fixture.componentRef.setInput('options', makeOptions());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(cmp).toBeTruthy();
  });

  it('shows placeholder initially and counts selections in multiple mode (badge logic via state)', () => {
    // No selection yet
    expect(cmp.triggerLabel()).toBe('Select…');

    // Switch to multiple and simulate 2 selections via internal value signal
    fixture.componentRef.setInput('multiple', true);
    (cmp as any)['valueSig'].set(['ber', 'ham']);
    fixture.detectChanges();

    expect(cmp.selectionCount()).toBe(2);
    // trigger label should list both labels
    expect(cmp.triggerLabel()).toContain('Berlin');
    expect(cmp.triggerLabel()).toContain('Hamburg');
  });

  it('open/close toggles state and emits events', () => {
    const openedSpy = jasmine.createSpy('opened');
    const closedSpy = jasmine.createSpy('closed');
    cmp.openedEvent.subscribe(openedSpy);
    cmp.closedEvent.subscribe(closedSpy);

    expect(cmp.opened()).toBeFalse();
    cmp.open();
    expect(cmp.opened()).toBeTrue();
    expect(openedSpy).toHaveBeenCalled();

    cmp.close();
    expect(cmp.opened()).toBeFalse();
    expect(closedSpy).toHaveBeenCalled();
  });

  it('i18n: German dictionary and override work (state-level)', () => {
    // Switch locale
    fixture.componentRef.setInput('locale', 'de');
    fixture.detectChanges();

    // Select one to make "Ausgewählt" relevant (checked via state)
    (cmp as any)['valueSig'].set('ham');
    fixture.detectChanges();

    expect(cmp.isSelected({ value: 'ham', label: 'Hamburg' })).toBeTrue();
    expect(cmp.t.selected).toBe('Ausgewählt');

    // Override clear label
    fixture.componentRef.setInput('i18n', { clear: 'Zurücksetzen' });
    fixture.componentRef.setInput('clearable', true);
    fixture.detectChanges();

    expect(cmp.t.clear).toBe('Zurücksetzen');
  });

  it('filtering uses query and reduces filtered list (no DOM assertions)', () => {
    // Initially all
    expect(cmp.filtered().length).toBe(3);

    cmp.onQuery('ham');
    fixture.detectChanges();
    expect(cmp.filtered().map((o) => o.label)).toEqual(['Hamburg']);

    cmp.onQuery('xxx');
    fixture.detectChanges();
    expect(cmp.filtered().length).toBe(0);
    expect(cmp.t.noResults.toLowerCase()).toContain('no');
  });

  it('single mode: pick closes when closeOnSelect=true (default)', () => {
    // ensure single mode
    fixture.componentRef.setInput('multiple', false);
    fixture.componentRef.setInput('closeOnSelect', true);
    fixture.detectChanges();

    cmp.open();
    expect(cmp.opened()).toBeTrue();
    cmp.pick(makeOptions()[0]);
    expect(cmp.opened()).toBeFalse();
    expect((cmp as any)['valueSig']()).toBe('ber');
  });

  it('multiple mode: pick toggles value and modal remains open', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    cmp.open();
    expect(cmp.opened()).toBeTrue();

    // add
    cmp.pick(makeOptions()[0]);
    expect(cmp.selectionCount()).toBe(1);
    expect(cmp.opened()).toBeTrue();

    // remove
    cmp.pick(makeOptions()[0]);
    expect(cmp.selectionCount()).toBe(0);
    expect(cmp.opened()).toBeTrue();
  });

  it('clear only makes sense when there is a selection (check state) and emits "cleared"', () => {
    fixture.componentRef.setInput('clearable', true);
    fixture.detectChanges();

    const clearedSpy = jasmine.createSpy('cleared');
    cmp.cleared.subscribe(clearedSpy);

    // no selection
    expect(cmp.hasSelection()).toBeFalse();

    // set selection, then clear
    (cmp as any)['valueSig'].set('ber');
    fixture.detectChanges();
    expect(cmp.hasSelection()).toBeTrue();

    cmp.clear();
    expect(cmp.hasSelection()).toBeFalse();
    expect(clearedSpy).toHaveBeenCalled();
  });

  it('disabled options cannot be selected', () => {
    const opts = [...makeOptions(), { value: 'x', label: 'X', disabled: true }];
    fixture.componentRef.setInput('options', opts);
    fixture.detectChanges();

    cmp.pick(opts[3]); // disabled
    expect((cmp as any)['valueSig']()).toBeNull();
  });

  it('displayWith and compareWith are respected', () => {
    type City = { id: number; name: string };

    const fx = TestBed.createComponent(IonxSearchSelect<City>);
    const c = fx.componentInstance;

    const opts: SelectOption<City>[] = [
      { value: { id: 1, name: 'One' }, label: 'ONE' },
      { value: { id: 2, name: 'Two' }, label: 'TWO' },
    ];

    fx.componentRef.setInput('options', opts);
    fx.componentRef.setInput('compareWith', (a: City, b: City) => a?.id === b?.id);
    fx.componentRef.setInput('displayWith', (o: SelectOption<City>) => `#${o.value.id} ${o.label}`);
    fx.detectChanges();

    c.writeValue({ id: 2, name: 'X' });
    fx.detectChanges();

    expect(c.triggerLabel()).toBe('#2 TWO');
  });

  it('keyboard navigation updates activeDescId and Enter picks; Escape closes', () => {
    cmp.open();
    fixture.detectChanges();

    // After open, with items, active index clamped to 0 => has a desc id
    const firstDesc = cmp.activeDescId();
    expect(firstDesc).toMatch(/ionx-ss-.*-opt-/);

    // ArrowDown (no DOM needed)
    cmp.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    const afterDown = cmp.activeDescId();
    expect(afterDown).toMatch(/ionx-ss-.*-opt-/);

    // Enter picks current (single mode default) and closes
    cmp.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(cmp.opened()).toBeFalse();

    // Re-open and Escape closes
    cmp.open();
    cmp.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cmp.opened()).toBeFalse();
  });
});

/* ================================
 * Forms integration hosts
 * ================================ */

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, IonxSearchSelect],
  template: `<ionx-search-select [options]="opts" [formControl]="ctrl"></ionx-search-select>`,
})
class HostReactiveSingle {
  ctrl = new FormControl<string | null>(null);
  opts = makeOptions();
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, IonxSearchSelect],
  template: `<ionx-search-select
    [options]="opts"
    [multiple]="true"
    [formControl]="ctrl"
  ></ionx-search-select>`,
})
class HostReactiveMulti {
  ctrl = new FormControl<string[] | null>(null);
  opts = makeOptions();
}

@Component({
  standalone: true,
  imports: [FormsModule, IonxSearchSelect],
  template: `<ionx-search-select [options]="opts" [(ngModel)]="model"></ionx-search-select>`,
})
class HostNgModelSingle {
  model: string | null = null;
  opts = makeOptions();
}

@Component({
  standalone: true,
  imports: [FormsModule, IonxSearchSelect],
  template: `<ionx-search-select
    [options]="opts"
    [multiple]="true"
    [(ngModel)]="model"
  ></ionx-search-select>`,
})
class HostNgModelMulti {
  model: string[] = [];
  opts = makeOptions();
}

/* ================================
 * Reactive Forms specs (CVA)
 * ================================ */

describe('IonxSearchSelect + ReactiveForms (single)', () => {
  let fixture: ComponentFixture<HostReactiveSingle>;
  let host: HostReactiveSingle;
  let child: IonxSearchSelect<string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostReactiveSingle],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostReactiveSingle);
    host = fixture.componentInstance;
    fixture.detectChanges();

    child = fixture.debugElement.children[0].componentInstance as IonxSearchSelect<string>;
  });

  it('writes value from FormControl to component', () => {
    host.ctrl.setValue('ham');
    fixture.detectChanges();
    expect(child.triggerLabel()).toBe('Hamburg');
  });

  it('emits value back to FormControl on pick', () => {
    child.open();
    child.pick(makeOptions()[2]); // "muc"
    expect(host.ctrl.value).toBe('muc');
  });

  it('clear sets FormControl to null', () => {
    host.ctrl.setValue('ber');
    fixture.detectChanges();

    child.clear();
    expect(host.ctrl.value).toBeNull();
  });
});

describe('IonxSearchSelect + ReactiveForms (multiple)', () => {
  let fixture: ComponentFixture<HostReactiveMulti>;
  let host: HostReactiveMulti;
  let child: IonxSearchSelect<string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostReactiveMulti],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostReactiveMulti);
    host = fixture.componentInstance;
    fixture.detectChanges();

    child = fixture.debugElement.children[0].componentInstance as IonxSearchSelect<string>;
  });

  it('writes array value from FormControl to component', () => {
    host.ctrl.setValue(['ber', 'ham']);
    fixture.detectChanges();
    expect(child.selectionCount()).toBe(2);
  });

  it('emits array value back to FormControl on toggled picks', () => {
    child.open();
    child.pick(makeOptions()[0]); // add 'ber'
    child.pick(makeOptions()[1]); // add 'ham'
    expect(host.ctrl.value).toEqual(['ber', 'ham'] as any);

    child.pick(makeOptions()[0]); // remove 'ber'
    expect(host.ctrl.value).toEqual(['ham'] as any);
  });

  it('clear sets FormControl to []', () => {
    host.ctrl.setValue(['ber', 'ham']);
    fixture.detectChanges();

    child.clear();
    expect(host.ctrl.value).toEqual([]);
  });
});

/* ================================
 * Template-driven (ngModel) specs
 * ================================ */

describe('IonxSearchSelect + ngModel (single)', () => {
  let fixture: ComponentFixture<HostNgModelSingle>;
  let host: HostNgModelSingle;
  let child: IonxSearchSelect<string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostNgModelSingle],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostNgModelSingle);
    host = fixture.componentInstance;
    fixture.detectChanges();

    child = fixture.debugElement.children[0].componentInstance as IonxSearchSelect<string>;
  });

  it('[(ngModel)] -> component (write)', async () => {
    host.model = 'ber';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(child.triggerLabel()).toBe('Berlin');
  });

  it('component -> [(ngModel)] (pick)', async () => {
    child.open();
    child.pick(makeOptions()[1]); // 'ham'
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.model).toBe('ham');
  });
});

describe('IonxSearchSelect + ngModel (multiple)', () => {
  let fixture: ComponentFixture<HostNgModelMulti>;
  let host: HostNgModelMulti;
  let child: IonxSearchSelect<string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostNgModelMulti],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostNgModelMulti);
    host = fixture.componentInstance;
    fixture.detectChanges();

    child = fixture.debugElement.children[0].componentInstance as IonxSearchSelect<string>;
  });

  it('[(ngModel)] array -> component (write)', async () => {
    host.model = ['ber', 'muc'];
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(child.selectionCount()).toBe(2);
  });

  it('component -> [(ngModel)] array (toggle picks)', async () => {
    child.open();
    child.pick(makeOptions()[0]); // add 'ber'
    child.pick(makeOptions()[1]); // add 'ham'
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.model).toEqual(['ber', 'ham']);
  });
});
