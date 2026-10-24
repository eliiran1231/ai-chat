import { withHashLocation } from '@angular/router';

export function routerFeaturesForProtocol(protocol: string | undefined) {
  return protocol === 'file:' ? [withHashLocation()] : [];
}
