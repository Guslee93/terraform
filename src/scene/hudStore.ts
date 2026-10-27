import { create } from 'zustand'

type HudState = {
  bearingDegrees: number
  scaleLabel: string
  scaleWidthPx: number
  setHud: (hud: { bearingDegrees: number; scaleLabel: string; scaleWidthPx: number }) => void
}

export const useHudStore = create<HudState>((set) => ({
  bearingDegrees: 0,
  scaleLabel: '20 m',
  scaleWidthPx: 80,
  setHud: (hud) => set(hud),
}))
