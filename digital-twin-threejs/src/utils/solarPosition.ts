import * as SunCalc from 'suncalc';
import type { ITimeOfDaySettings } from '../types/timeOfDay';

export type SolarPhase =
  | 'night'
  | 'astronomical dawn'
  | 'nautical dawn'
  | 'civil dawn'
  | 'sunrise'
  | 'daylight'
  | 'golden hour'
  | 'sunset'
  | 'civil dusk'
  | 'nautical dusk'
  | 'astronomical dusk';

export interface ISolarState {
  instant: Date;
  azimuth: number;
  elevation: number;
  threeAzimuth: number;
  phase: SolarPhase;
  sunIntensity: number;
  ambientIntensity: number;
  skyTurbidity: number;
  skyRayleigh: number;
  skyMieCoefficient: number;
  skyMieDirectionalG: number;
  moonAltitude: number;
  moonAzimuth: number;
  moonIllumination: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTimeZoneOffset(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === '24' ? 0 : Number(values.hour);
  const zonedTimestamp = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    hour,
    Number(values.minute),
    Number(values.second),
  );

  return zonedTimestamp - date.getTime();
}

function parseZonedDateTime(date: string, time: string, timezone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const localTimestamp = Date.UTC(year, month - 1, day, hour, minute, 0);
  const initialGuess = new Date(localTimestamp);
  const firstOffset = getTimeZoneOffset(initialGuess, timezone);
  const firstInstant = new Date(localTimestamp - firstOffset);
  const secondOffset = getTimeZoneOffset(firstInstant, timezone);

  return new Date(localTimestamp - secondOffset);
}

type SunTimes = ReturnType<typeof SunCalc.getTimes>;

function getPhase(instant: Date, times: SunTimes): SolarPhase {
  const timestamp = instant.getTime();
  const event = (name: keyof SunTimes) => times[name] instanceof Date ? times[name].getTime() : Number.NaN;

  if (timestamp < event('nightEnd')) return 'night';
  if (timestamp < event('nauticalDawn')) return 'astronomical dawn';
  if (timestamp < event('dawn')) return 'nautical dawn';
  if (timestamp < event('sunrise')) return 'civil dawn';
  if (timestamp < event('goldenHourEnd')) return 'sunrise';
  if (timestamp < event('goldenHour')) return 'daylight';
  if (timestamp < event('sunsetStart')) return 'golden hour';
  if (timestamp < event('sunset')) return 'sunset';
  if (timestamp < event('dusk')) return 'civil dusk';
  if (timestamp < event('nauticalDusk')) return 'nautical dusk';
  if (timestamp < event('night')) return 'astronomical dusk';
  return 'night';
}

export function getSolarState(settings: ITimeOfDaySettings): ISolarState {
  const instant = parseZonedDateTime(settings.date, settings.time, settings.timezone);
  const position = SunCalc.getPosition(instant, settings.latitude, settings.longitude);
  const times = SunCalc.getTimes(instant, settings.latitude, settings.longitude);
  const moonPosition = SunCalc.getMoonPosition(instant, settings.latitude, settings.longitude);
  const moonIllumination = SunCalc.getMoonIllumination(instant);
  const elevation = position.altitude;
  const azimuth = ((position.azimuth % 360) + 360) % 360;
  const daylight = clamp((elevation + 6) / 18, 0, 1);
  const sunHeight = clamp(elevation / 60, 0, 1);
  const phase = getPhase(instant, times);

  return {
    instant,
    azimuth,
    elevation,
    // Three.js uses +Z as a natural north-facing reference here. The offset
    // lets a model authored in local coordinates align with geographic north.
    threeAzimuth: 90 - azimuth + settings.northOffset,
    phase,
    sunIntensity: daylight * (0.55 + sunHeight * 0.7),
    ambientIntensity: 0.42 + daylight * 0.5,
    skyTurbidity: 2.8 + (1 - daylight) * 3.5,
    skyRayleigh: 1.8 + daylight * 0.9,
    skyMieCoefficient: 0.003 + (1 - daylight) * 0.006,
    skyMieDirectionalG: 0.72,
    moonAltitude: moonPosition.altitude,
    moonAzimuth: ((moonPosition.azimuth % 360) + 360) % 360,
    moonIllumination: moonIllumination.fraction,
  };
}
