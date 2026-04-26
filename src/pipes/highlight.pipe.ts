import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'highlight',
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  transform(value: string | null | undefined, searchTerm: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const normalizedSearchTerm = searchTerm?.trim();

    if (!normalizedSearchTerm) {
      return value;
    }

    const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlightPattern = new RegExp(`(${escapedSearchTerm})`, 'gi');

    return value.replace(highlightPattern, '<mark>$1</mark>');
  }
}
