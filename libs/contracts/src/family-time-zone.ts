import { Type, type Static } from '@sinclair/typebox';
import { TimeZoneName } from './calendar.js';

const closed = { additionalProperties: false };

// The family's time zone as the parent space shows it. Until a parent's
// device has filled it in, `set` is false and the zone is the deployment's
// default, which the family's days are counted in meanwhile.
export const FamilyTimeZoneSetting = Type.Object(
  { timeZone: TimeZoneName, set: Type.Boolean() },
  closed,
);

// A zone the parent chose, or with `fill` a device's own zone, which only
// fills in a family that has none yet and leaves a zone already set alone.
// The reply is the family's zone as saved.
export const FamilyTimeZoneChange = Type.Object(
  { timeZone: TimeZoneName, fill: Type.Optional(Type.Boolean()) },
  closed,
);

// The zone a signed-in parent's or child's pages follow for day and night.
export const FamilyTimeZone = Type.Object({ timeZone: TimeZoneName }, closed);

export type FamilyTimeZoneSetting = Static<typeof FamilyTimeZoneSetting>;
export type FamilyTimeZoneChange = Static<typeof FamilyTimeZoneChange>;
export type FamilyTimeZone = Static<typeof FamilyTimeZone>;
