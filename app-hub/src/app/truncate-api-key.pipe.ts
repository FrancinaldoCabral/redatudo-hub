import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateApiKey'
})
export class TruncateApiKeyPipe implements PipeTransform {
  transform(value: string, visibleStart: number = 4, visibleEnd: number = 4, mask: string = '***'): string {
    if (!value || value.length <= (visibleStart + visibleEnd)) {
      return value; // Retorna sem modificar se a chave for muito curta
    }

    const start = value.slice(0, visibleStart);
    const end = value.slice(-visibleEnd);
    return `${start}${mask}${end}`;
  }
}
