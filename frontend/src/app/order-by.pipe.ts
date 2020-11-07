import {Pipe, PipeTransform} from '@angular/core';


@Pipe({
  name: 'orderBy'
})
export class OrderByPipe implements PipeTransform {

  transform<T>(values: Array<T>, field: undefined | keyof T): Array<T> {
    if (!field || !Array.isArray(values)) {
      // If no field is defined then return the values as-is
      return values;
    }

    return values.sort((a: T, b: T) => {
      const v0 = a[field];
      const v1 = b[field];

      if (v0 < v1) {
        return -1;
      }

      if (v0 > v1) {
        return 1;
      }

      return 0;
    });
  }

}
