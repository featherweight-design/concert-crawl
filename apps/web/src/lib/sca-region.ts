// SCA region detection (eng infra spec Part 2 §1.7): the conditional
// "Your bank may ask to confirm this payment." checkout line renders for
// EEA + UK users. Vercel supplies x-vercel-ip-country on the web tier;
// the server layer resolves the boolean and passes it down as a prop.
// No IP handling, no persistence. Unknown country ⇒ show the line
// (harmless one-liner — fail safe toward compliance).

const SCA_REGIONS: ReadonlySet<string> = new Set([
  // EU members
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  // EEA non-EU
  'IS',
  'LI',
  'NO',
  // UK
  'GB',
])

export const isScaRegion = (countryCode: string | null): boolean =>
  countryCode === null || SCA_REGIONS.has(countryCode.toUpperCase())
