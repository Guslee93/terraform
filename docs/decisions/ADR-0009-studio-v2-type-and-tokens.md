# ADR-0009 — Studio v2 typefaces and tokens

- **Status:** Proposed (owner to accept)
- **Date:** 2026-11-02
- **Deciders:** Project owner, `design-ui-designer`
- **Related:** ADR-0001 (stack and pinned versions), `docs/design/ui-redesign-spec.md`, `docs/design/design-contract.md`

## Context

The approved "Studio v2 · minimal" direction (`docs/design/ui-redesign-spec.md`, 2026-11-02) replaces the warm surfaces, Inter + Newsreader pairing and 15 ad-hoc text sizes with a cool, data-first system where figures carry the hierarchy. Figures and labels need a monospaced face; the editorial serif has no role left.

## Decision

1. **Fonts.** Remove `@fontsource-variable/inter` and `@fontsource-variable/newsreader`. Add `@fontsource-variable/geist` **5.3.0** and `@fontsource-variable/geist-mono` **5.3.0**, pinned exactly, self-hosted (offline demo unchanged).
2. **Tokens.** `src/styles/tokens.css` carries the contract §2 palette. Radii live as Tailwind theme tokens in `global.css` (`rounded-card`, `rounded-control`, `rounded-pill`) so the theme names do not reference themselves. `--shadow-soft` and the unused `--scene-*` CSS tokens are deleted; scene colours stay as TypeScript constants in `src/scene/*` (contract §8).
3. **Type scale.** Ten `@utility` classes (`text-hero`, `text-display`, `text-figure-l`, `text-figure`, `text-figure-s`, `text-title`, `text-body`, `text-body-sm`, `text-label`, `text-unit`) each carry family, weight, tracking and case. No arbitrary `text-[…]` or `tracking-[…]` classes remain in `src/`.
4. **Utility names.** The existing short colour utilities (`bg-app`, `text-ink`, `border-line`, `bg-viewport`) are kept and repointed rather than renamed to the spec's long names; new tokens get utilities with their token names (`bg-surface-paper`, `bg-muted-fill`, `text-sun-high`, …). Removed tokens were mapped: `surface-muted` → `muted-fill`, `surface-sunken`/`surface-subtle` → `surface-paper`, `ink-hover` → `ink/85`, `line-dashed` → `line`.

## Licence and size

- Geist and Geist Mono: SIL Open Font License 1.1 (Vercel). Fontsource packaging MIT.
- Latin woff2 (normal axis): Geist 29.4 kB, Geist Mono 23.1 kB in the production build. Inter + Newsreader latin were of similar size; other subsets load only by `unicode-range`.

## Consequences

- Every component class string changed mechanically; component structure is unchanged until round 2 of the spec.
- Small non-uppercase copy that was 9–11 px became `text-body-sm` (13 px) instead of `text-label`, so only labels are uppercase (spec §3.2 rule beats the mechanical mapping).
- Landing and About headings use `text-figure-l` (64 px) for now; their full restyle is M5.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep Inter, add a mono | Two sans faces in the bundle with no role for Inter's extra width. |
| Rename every utility to the spec's long names (`bg-bg-app`) | ~300 churned call sites for no visual change. |
