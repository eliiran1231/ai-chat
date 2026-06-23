import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filesize',
  standalone: true,
})
export class FilesizePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (!Number.isFinite(value) || value === null || value === undefined) {
      return '0 B';
    }

    const formatter = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    });
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Math.max(value, 0);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${formatter.format(size)} ${units[unitIndex]}`;
  }
}
