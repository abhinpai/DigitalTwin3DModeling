export type TimeOfDayMode = 'automatic' | 'manual';

export interface ITimeOfDaySettings {
  mode: TimeOfDayMode;
  locationLabel?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  date: string;
  time: string;
  northOffset: number;
  cloudsEnabled?: boolean;
}
