/**
 * The claim every sun-hours layer carries (ADR-0021; ADR-0031 for the analysis in the circle):
 * geometric direct sun, clear sky, buildings only — never a daylight or compliance result. It says
 * where the building heights come from (feasibility 09 §5, ADR-0033).
 */
const claim = (heights: string) =>
  `Indicative sun hours — geometric, clear sky, buildings only (${heights}); terrain and trees do not shade. Not a daylight assessment.`

export const SUN_HOURS_DISCLAIMER = claim('heights estimated from storeys')
export const SUN_HOURS_DISCLAIMER_MEASURED = claim('heights from Kartverket surface model')

/** `measuredHeights`: the package carries a measured heights layer. */
export const sunHoursDisclaimer = (measuredHeights: boolean) => (measuredHeights ? SUN_HOURS_DISCLAIMER_MEASURED : SUN_HOURS_DISCLAIMER)
