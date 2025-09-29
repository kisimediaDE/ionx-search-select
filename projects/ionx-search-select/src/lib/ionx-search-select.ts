import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonFooter,
  IonButtons,
  IonBadge,
} from '@ionic/angular/standalone';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption<T = unknown> {
  value: T;
  label: string;
  disabled?: boolean;
}

let uid = 0;

@Component({
  selector: 'ionx-search-select',
  imports: [
    CommonModule,
    IonButton,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonFooter,
    IonButtons,
    IonBadge,
  ],
  templateUrl: './ionx-search-select.html',
  styleUrls: ['./ionx-search-select.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ionx-search-select block' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IonxSearchSelect),
      multi: true,
    },
  ],
})
export class IonxSearchSelect<T = unknown> implements ControlValueAccessor {
  /** Inputs */
  options = input<SelectOption<T>[]>([]);
  placeholder = input('Select…');
  multiple = input(false);
  clearable = input(true);
  closeOnSelect = input(true);
  searchPlaceholder = input('Search');

  /** Customization hooks */
  displayWith = input<(opt: SelectOption<T>) => string>((o) => o.label);
  compareWith = input<(a: T, b: T) => boolean>((a, b) => a === b);
  trackBy = input<(o: SelectOption<T>) => unknown>((o) => o.value);

  /** Outputs */
  changed = output<T | T[] | null>();
  openedChange = output<boolean>();
  openedEvent = output<void>({ alias: 'opened' });
  closedEvent = output<void>({ alias: 'closed' });
  cleared = output<void>();

  /** State (Signals) */
  opened = signal(false);
  query = signal('');
  private valueSig = signal<T | T[] | null>(null);
  disabled = signal(false);

  /** Focus & active option */
  private activeIndex = signal<number>(-1);
  private id = `ionx-ss-${++uid}`;
  readonly titleId = `${this.id}-title`;
  readonly listId = `${this.id}-list`;

  /** Refs */
  private host = inject(ElementRef<HTMLElement>);
  searchEl = viewChild<ElementRef<HTMLIonSearchbarElement>>('searchEl');
  listEl = viewChild<ElementRef<HTMLElement>>('listEl');

  /** Derived */
  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter((o) => this.displayWith()(o).toLowerCase().includes(q));
  });

  selectionCount = computed(() => {
    const val = this.valueSig();
    return Array.isArray(val) ? val.length : val == null ? 0 : 1;
  });

  hasSelection = computed(() => this.selectionCount() > 0);

  triggerLabel = computed(() => {
    const val = this.valueSig();
    if (val == null) return this.placeholder();

    if (this.multiple()) {
      const arr = Array.isArray(val) ? val : [val];
      const labels = this.options()
        .filter((o) => arr.some((v) => this.compareWith()(o.value, v)))
        .map((o) => this.displayWith()(o))
        .join(', ');
      return labels || this.placeholder();
    }

    const found = this.options().find((o) => this.compareWith()(o.value, val as T));
    return found ? this.displayWith()(found) : this.placeholder();
  });

  /** Keep activeIndex innerhalb des gefilterten Bereichs */
  private clampActive = effect(() => {
    const len = this.filtered().length;
    if (len === 0) {
      this.activeIndex.set(-1);
    } else {
      const i = this.activeIndex();
      if (i < 0 || i >= len) this.activeIndex.set(0);
    }
  });

  /** Public API */
  open() {
    if (this.disabled()) return;
    this.opened.set(true);
    this.openedChange.emit(true);
    this.openedEvent.emit();

    // Fokussieren, wenn Modal gerendert ist
    queueMicrotask(() => this.searchEl()?.nativeElement.setFocus());
  }

  close() {
    this.opened.set(false);
    this.openedChange.emit(false);
    this.closedEvent.emit();
    this.onTouched();
  }

  onDidDismiss() {
    // Falls durch Overlay geschlossen
    if (this.opened()) this.close();
  }

  clear() {
    const next = this.multiple() ? ([] as T[]) : null;
    this.valueSig.set(next);
    this.onChange(next);
    this.changed.emit(next);
    this.cleared.emit();
    // Fokus zurück in die Suche
    queueMicrotask(() => this.searchEl()?.nativeElement.setFocus());
  }

  onQuery(q: string) {
    this.query.set(q);
    // beim neuen Filter aktiv auf das erste Treffer-Item setzen
    if (this.filtered().length > 0) this.activeIndex.set(0);
  }

  /** ARIA/IDs */
  optionId(opt: SelectOption<T>) {
    return `${this.id}-opt-${this.trackBy()(opt)}`;
  }
  activeDescId = computed(() => {
    const i = this.activeIndex();
    const arr = this.filtered();
    return i >= 0 && i < arr.length ? this.optionId(arr[i]) : null;
  });

  isSelected(opt: SelectOption<T>): boolean {
    const val = this.valueSig();
    if (this.multiple()) {
      const arr = Array.isArray(val) ? val : [];
      return arr.some((v) => this.compareWith()(v as T, opt.value));
    }
    return val != null && this.compareWith()(val as T, opt.value);
  }

  isActive(opt: SelectOption<T>): boolean {
    const i = this.activeIndex();
    const arr = this.filtered();
    return i >= 0 && i < arr.length && this.trackBy()(arr[i]) === this.trackBy()(opt);
  }

  pick(opt: SelectOption<T>) {
    if (opt.disabled) return;

    if (this.multiple()) {
      const cur = Array.isArray(this.valueSig()) ? (this.valueSig() as T[]) : [];
      const exists = cur.some((v) => this.compareWith()(v, opt.value));
      const next = exists
        ? cur.filter((v) => !this.compareWith()(v, opt.value))
        : [...cur, opt.value];
      this.valueSig.set(next);
      this.onChange(next);
      this.changed.emit(next);
      // bleibt offen – Footer „Fertig“ schließt
    } else {
      this.valueSig.set(opt.value);
      this.onChange(opt.value);
      this.changed.emit(opt.value);
      if (this.closeOnSelect()) this.close();
    }
  }

  /** Tastatursteuerung */
  onKeydown(ev: KeyboardEvent) {
    const len = this.filtered().length;
    if (len === 0) return;

    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault();
        this.activeIndex.set(Math.min(this.activeIndex() + 1, len - 1));
        this.scrollActiveIntoView();
        break;

      case 'ArrowUp':
        ev.preventDefault();
        this.activeIndex.set(Math.max(this.activeIndex() - 1, 0));
        this.scrollActiveIntoView();
        break;

      case 'Enter':
      case ' ':
        ev.preventDefault();
        this.pick(this.filtered()[this.activeIndex()]);
        break;

      case 'Escape':
        ev.preventDefault();
        this.close();
        break;
    }
  }

  private scrollActiveIntoView() {
    const list = this.listEl()?.nativeElement;
    const i = this.activeIndex();
    if (!list || i < 0) return;
    const opt = list.querySelector<HTMLElement>('#' + this.activeDescId());
    opt?.scrollIntoView({ block: 'nearest' });
  }

  /** ControlValueAccessor */
  private onChange: (v: T | T[] | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(obj: T | T[] | null): void {
    this.valueSig.set(obj);
  }

  registerOnChange(fn: (v: T | T[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
