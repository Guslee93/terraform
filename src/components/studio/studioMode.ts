/** "Test a building" turns the massing and scenario tools on; the default studio is analysis only. */
export const TEST_BUILDING_KEY = 'terraform:test-building:v1'

export function readTestBuilding(): boolean {
  try {
    return localStorage.getItem(TEST_BUILDING_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeTestBuilding(on: boolean): void {
  try {
    localStorage.setItem(TEST_BUILDING_KEY, String(on))
  } catch {
    // Private mode: the toggle still works for this visit.
  }
}
