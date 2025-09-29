import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { IonxSearchSelect, SelectOption } from 'ionx-search-select';

type Id = string;

@Component({
  standalone: true,
  selector: 'demo-page',
  templateUrl: './demo.page.html',
  styleUrls: ['./demo.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonxSearchSelect,
  ],
})
export class DemoPage {
  // Options
  readonly cityOptions: SelectOption<Id>[] = [
    { value: 'ber', label: 'Berlin' },
    { value: 'ham', label: 'Hamburg' },
    { value: 'muc', label: 'Munich' },
    { value: 'cgn', label: 'Cologne', disabled: true },
    { value: 'fra', label: 'Frankfurt' },
  ];

  // Reactive Forms
  readonly form = new FormGroup({
    city: new FormControl<Id | null>(null),
    cities: new FormControl<Id[]>([]),
  });

  // 🔹 Display-State as Signals (without RxJS)
  private readonly selectedCity = signal<Id | null>(this.form.controls.city.value);
  private readonly selectedCities = signal<Id[]>(this.form.controls.cities.value ?? []);

  // 🔹 Display-Labels derived from Signals
  readonly currentCityLabel = computed(() => {
    const id = this.selectedCity();
    return this.cityOptions.find((o) => o.value === id)?.label ?? '–';
  });

  readonly currentCitiesLabel = computed(() => {
    const ids = this.selectedCities();
    const map = new Map(this.cityOptions.map((o) => [o.value, o.label] as const));
    return ids.map((id) => map.get(id) ?? id).join(', ') || '–';
  });

  // Events from the component → Signals update (no RxJS)
  onSingleChanged(v: Id | Id[] | null) {
    this.selectedCity.set(Array.isArray(v) ? v[0] ?? null : v);
  }

  onMultiChanged(v: Id | Id[] | null) {
    this.selectedCities.set(Array.isArray(v) ? v : v != null ? [v] : []);
  }
}
