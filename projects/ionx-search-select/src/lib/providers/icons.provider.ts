import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

let registered = false;

/** Registriert Icons einmalig, wenn die Komponente das erste Mal konstruiert wird. */
export function ensureIcons() {
  if (registered) return;
  addIcons({
    'close-outline': closeOutline,
  });
  registered = true;
}
