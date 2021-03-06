import {InjectionToken} from "@angular/core";

export interface Environment {
  baseApiPath: string;
}

export const ENVIRONMENT = new InjectionToken<Environment>('app.environment');
