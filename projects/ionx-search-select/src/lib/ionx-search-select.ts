import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  forwardRef,
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
  IonIcon,
} from '@ionic/angular/standalone';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ensureIcons } from './providers/icons.provider';

export interface SelectOption<T = unknown> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Übersetzbare Texte */
export type IonxSearchSelectI18n = {
  clear: string; // Button-Label "Leeren"
  done: string; // Button-Label "Fertig"
  selected: string; // Note-Label "Ausgewählt"
  noResults: string; // Platzhalter, wenn gefilterte Liste leer ist
  search: string; // Placeholder im Suchfeld
  searchAriaLabel: string; // ARIA-Label für das Suchfeld
  closeAriaLabel: string; // ARIA-Label für den Schließen-Button
};

const I18N_DICTIONARIES: Record<'en' | 'de', IonxSearchSelectI18n> = {
  en: {
    clear: 'Clear',
    done: 'Done',
    selected: 'Selected',
    noResults: 'No results',
    search: 'Search',
    searchAriaLabel: 'Search options',
    closeAriaLabel: 'Close',
  },
  de: {
    clear: 'Leeren',
    done: 'Fertig',
    selected: 'Ausgewählt',
    noResults: 'Keine Ergebnisse',
    search: 'Suchen',
    searchAriaLabel: 'Optionen durchsuchen',
    closeAriaLabel: 'Schließen',
  },
};

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
    IonIcon,
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
  placeholder = input('Select…'); // Title in Modal
  multiple = input(false);
  clearable = input(true);
  closeOnSelect = input(true); // only relevant if !multiple

  /** Neu: Language & Overrides */
  locale = input<'en' | 'de'>('en');
  i18n = input<Partial<IonxSearchSelectI18n>>({});

  /** Backwards-Compat: explicit Search-Placeholder */
  searchPlaceholder = input<string | null>(null);

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
  private searchEl = viewChild<IonSearchbar>('searchEl');
  private listEl = viewChild<ElementRef<HTMLElement>>('listEl');
  private triggerEl = viewChild<ElementRef<HTMLButtonElement>>('triggerEl');

  /** I18n computed: Overrides > Inputs > Locale-Defaults */
  private dict = computed<IonxSearchSelectI18n>(() => {
    const base = I18N_DICTIONARIES[this.locale()] ?? I18N_DICTIONARIES.en;
    const overrides = this.i18n();
    const explicitSearch = this.searchPlaceholder();

    return {
      ...base,
      ...(explicitSearch ? { search: explicitSearch } : null),
      ...overrides,
    };
  });

  /** Derived */
  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter((o) => String(this.displayWith()(o)).toLowerCase().includes(q));
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

  /** Keep activeIndex within the filtered range */
  private clampActive = effect(() => {
    const len = this.filtered().length;
    if (len === 0) {
      this.activeIndex.set(-1);
    } else {
      const i = this.activeIndex();
      if (i < 0 || i >= len) this.activeIndex.set(0);
    }
  });

  constructor() {
    ensureIcons();
  }

  /** Public API */
  open() {
    if (this.disabled()) return;
    this.opened.set(true);
    this.openedChange.emit(true);
    this.openedEvent.emit();
  }

  close() {
    this.opened.set(false);
    this.openedChange.emit(false);
    this.closedEvent.emit();
    this.onTouched();
    this.triggerEl()?.nativeElement?.focus();
  }

  onDidDismiss() {
    if (this.opened()) this.close();
  }

  onDidPresent() {
    this.focusSearch();
  }

  clear() {
    const next = this.multiple() ? ([] as T[]) : null;
    this.valueSig.set(next);
    this.onChange(next);
    this.changed.emit(next);
    this.cleared.emit();
    if (this.opened()) this.focusSearch();
  }

  onQuery(q: string) {
    this.query.set(q);
    if (this.filtered().length > 0) this.activeIndex.set(0);
  }

  private focusSearch() {
    this.searchEl()?.setFocus();
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
      // remains open – Footer "Done/Fertig" closes
    } else {
      this.valueSig.set(opt.value);
      this.onChange(opt.value);
      this.changed.emit(opt.value);
      if (this.closeOnSelect()) this.close();
    }
  }

  /** Keyboard Navigation */
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

  /** Exposed i18n getters for template */
  get t() {
    return this.dict();
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
