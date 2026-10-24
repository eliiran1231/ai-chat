import { APP_BASE_HREF, LocationStrategy } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { routerFeaturesForProtocol } from './router-features';

describe('routing by deployment protocol', () => {
  for (const [protocol, expected] of [['file:', '#/settings'], ['https:', '/settings'], ['http:', '/settings']]) {
    it(`uses the correct external URL for ${protocol}`, () => {
      TestBed.configureTestingModule({ providers: [
        { provide: APP_BASE_HREF, useValue: '/' },
        provideRouter([], ...routerFeaturesForProtocol(protocol)),
      ] });
      expect(TestBed.inject(LocationStrategy).prepareExternalUrl('/settings')).toBe(expected);
    });
  }
});
