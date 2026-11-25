import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Color, Uniform } from 'three'

/**
 * Misty, blurred vignette (ADR-0041): the centre of the view stays sharp; toward the frame edges the
 * image softens (a golden-angle disc blur whose radius grows with the distance from the centre) and
 * mixes into the mist colour. Runs after tone mapping in the composer only, so export passes that
 * render the scene directly never see it. Replaces the darkening VignetteEffect in IDENTITY.
 */
const fragmentShader = /* glsl */ `
uniform vec3 mistColour;
uniform float strength;
uniform float clearRadius;
uniform float blurPx;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // 0 at the centre, 1 at the corners; frame-shaped, so all four edges mist alike.
  float d = length((uv - 0.5) * 2.0) * 0.70710678;
  float m = smoothstep(clearRadius, 1.0, d);
  vec3 sum = inputColor.rgb;
  float n = 1.0;
  float radius = m * blurPx;
  if (radius > 0.5) {
    for (int i = 0; i < 24; i++) {
      float fi = float(i);
      float angle = fi * 2.39996323;
      vec2 offset = vec2(cos(angle), sin(angle)) * sqrt((fi + 0.5) / 24.0) * radius * texelSize;
      sum += texture2D(inputBuffer, uv + offset).rgb;
      n += 1.0;
    }
  }
  outputColor = vec4(mix(sum / n, mistColour, m * strength), inputColor.a);
}
`

export type MistVignetteOptions = {
  /** The mist colour (a display colour; three converts the hex to linear). */
  readonly colour: string
  /** How far the frame edges mix into the mist, 0–1. */
  readonly strength: number
  /** The clear centre, 0–1 of the centre-to-corner distance; the mist starts beyond it. */
  readonly clearRadius: number
  /** Blur radius at the corners, in render-target pixels. */
  readonly blurPx: number
}

export class MistVignetteEffect extends Effect {
  constructor({ colour, strength, clearRadius, blurPx }: MistVignetteOptions) {
    super('MistVignetteEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['mistColour', new Uniform(new Color(colour))],
        ['strength', new Uniform(strength)],
        ['clearRadius', new Uniform(clearRadius)],
        ['blurPx', new Uniform(blurPx)],
      ]),
    })
  }
}

