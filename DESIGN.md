---
name: Getrive
description: A restrained, technical signal-intelligence instrument for founders listening for their first customers
colors:
  void-teal: "#0a1211"
  signal-white: "#eae7e0"
  moss-panel: "#2a413a"
  field-sage: "#4a6a5e"
  clay-alert: "#c4544a"
  quiet-gray: "#c4c4c4"
typography:
  display:
    fontFamily: "Outfit, ui-sans-serif, system-ui"
    fontSize: "7rem (11rem at md breakpoint)"
    fontWeight: 500
    lineHeight: 0.75
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Outfit, ui-sans-serif, system-ui"
    fontSize: "1.875rem (2.25rem at md breakpoint)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Outfit, ui-sans-serif, system-ui"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  body:
    fontFamily: "Outfit, ui-sans-serif, system-ui"
    fontSize: "0.8125rem-0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Source Code Pro, ui-monospace, monospace"
    fontSize: "0.625rem-0.6875rem"
    fontWeight: 500
    letterSpacing: "0.15em"
rounded:
  sm: "0.321rem"
  md: "0.428rem"
  lg: "0.535rem"
  xl: "0.749rem"
  full: "9999px"
spacing:
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal-white}"
    textColor: "{colors.void-teal}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.signal-white}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.signal-white}"
    rounded: "{rounded.lg}"
    height: "32px"
  button-destructive:
    backgroundColor: "{colors.clay-alert}"
    textColor: "{colors.clay-alert}"
    rounded: "{rounded.lg}"
    height: "32px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.signal-white}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.void-teal}"
    rounded: "{rounded.xl}"
    padding: "16px"
  label-mono:
    textColor: "{colors.quiet-gray}"
    typography: "{typography.label}"
---

# Design System: Getrive

## 1. Overview

**Creative North Star: "The Listening Node"**

Getrive's interface doesn't perform "AI tool" — it performs *instrument*. Every surface reads like a quiet, always-on receiver: a near-black deep-teal field, a single warm-white signal, one muted sage accent that only lights up for what matters right now. The vocabulary is already load-bearing in the app's own copy — "listening node," "phase," "calibration," "signal" — and the visual system exists to make that vocabulary feel earned rather than decorative. This is not a SaaS dashboard wearing sci-fi skin; it's a precision instrument a stressed, time-constrained founder can trust to be watching carefully so they don't have to.

The system explicitly rejects the generic SaaS-cream dashboard (warm off-white surfaces, identical card grids, gradient hero-metric blocks), any playful or cutesy startup register (no mascots, no bouncy illustration, no exclamation-point copy), and stodgy navy-and-gray enterprise blandness. Getrive is dark, quiet, and precise — never loud, never cute, never beige.

**Key Characteristics:**
- Near-black deep-teal field with exactly one warm-white ink and one muted-sage accent — nothing else competes for attention.
- Flat surfaces, edge-defined by a hairline inset ring rather than drop-shadow elevation.
- A single recurring typographic device — the tiny tracked-out monospace uppercase label — does the work five different UI patterns would otherwise need.
- Motion is diagnostic, not decorative: pulses, scan-lines, and phase-progress fills all read as "the system is actively listening," never as flourish.

## 2. Colors

A two-ink palette on a near-black field: one warm-white for everything the founder reads, one muted sage for the one thing that's active right now.

### Primary
- **Signal White** (#eae7e0): The only text/ink color and the primary button fill (inverted: signal-white background, void-teal text). Used for headlines, primary body copy, and the one high-emphasis action per screen.

### Secondary
- **Field Sage** (#4a6a5e): The single accent. Active nav state, focus rings, the pulsing "listening" dot, selected-card highlight, links. Reserved for state and emphasis only — never a decorative fill.

### Neutral
- **Void Teal** (#0a1211): The field itself — background, card, and popover surfaces share this one value. There is no separate "elevated surface" tone; depth comes from the ring system (see Elevation), not a lighter panel color.
- **Moss Panel** (#2a413a): Borders, dividers, input fields, and the secondary/muted surface (badges, the karma-panel background). The quiet structural color.
- **Quiet Gray** (#c4c4c4): Muted-foreground text — secondary copy, timestamps, placeholder text, unselected label state.
- **Clay Alert** (#c4544a): Destructive state only — always used at low opacity as a tinted background (`clay-alert` at ~10-20%) with full-opacity text, never a solid alert-red fill.

### Named Rules
**The One Accent Rule.** Field Sage is the *only* saturated color in the system. If a screen needs a second visual emphasis, reach for weight or size on Signal White before reaching for a second hue.

**The Soft Alert Rule.** Destructive/error states are a tinted wash of Clay Alert (background at 10-20% opacity, full-opacity text) — never a solid red fill. Alarm is legible, not loud.

## 3. Typography

**Display Font:** Outfit (with ui-sans-serif, system-ui fallback)
**Body Font:** Outfit (same family — one sans carries every weight, per the product register's "one family is often right")
**Label/Mono Font:** Source Code Pro (with ui-monospace, monospace fallback)

**Character:** Outfit is geometric but not cold — rounded terminals keep it warm enough for a founder-facing tool. Source Code Pro is reserved entirely for the label voice: it never appears in a sentence, only in tracked-out uppercase fragments that read as telemetry, not prose.

### Hierarchy
- **Display** (500 weight, 7rem stepping to 11rem at the md breakpoint, 0.75 line-height, -0.04em tracking): The single headline metric on the Dashboard ("users acquired"). Used exactly once per product — this is the one place scale is allowed to shout.
- **Headline** (500 weight, 1.875rem stepping to 2.25rem, tight tracking): Onboarding step titles ("Choose your positioning," "Recommended subreddits").
- **Title** (500 weight, 1.5rem, wide tracking): Page-level headers (Dashboard, Signals, Positioning, Settings).
- **Body** (400 weight, 0.8125-0.9375rem, 1.6 line-height): Descriptions, signal bodies, reasoning text. Caps at 65-75ch where it runs as prose (signal detail, ICP reasoning).
- **Label** (500 weight, 0.625-0.6875rem, 0.15em tracking, uppercase): Every micro-label in the system — phase indicators, stat captions, field labels, status badges, section eyebrows within Settings sections.

### Named Rules
**The Mono Label Rule.** Any text under 12px is Source Code Pro, uppercase, and tracked at 0.15em, full stop. This is the system's single most-repeated device — it is what makes a stat caption, a form label, and a phase indicator all read as the same instrument. It is a *functional* labeling convention (field labels, live status, phase state), not a decorative marketing eyebrow — it must never be reached for as a per-section "ABOUT / PROCESS / PRICING"-style kicker, which is a different, banned pattern.

**The One-Family Rule.** Outfit carries every weight from body copy to the 11rem hero number. No second display face. Contrast comes from scale and the mono-label voice, not a second serif or humanist pairing.

## 4. Elevation

Getrive is flat by default. There is no separate "elevated surface" background tone — cards and panels share the exact background color of the page itself. Depth is communicated by a **1px inset ring** (`box-shadow: inset 0 0 0 1px var(--border)`), not a drop shadow: a hairline that brightens from Moss Panel to Field Sage on hover or selection. The one deliberate exception is the standalone Subreddit card, which earns a soft ambient shadow (`0 4px 24px -8px rgba(0,0,0,0.2)`) plus a backdrop blur — reserved for a card that floats independently in a list rather than sitting inside a grouped panel.

### Shadow Vocabulary
- **Ring-rest** (`box-shadow: inset 0 0 0 1px var(--border)`): Default state for every settings section, onboarding option card, and grouped panel.
- **Ring-hover / Ring-selected** (`box-shadow: inset 0 0 0 1px var(--accent)`): Hover and selected states for the same components — the ring brightens to Field Sage, nothing else changes.
- **Ambient-float** (`box-shadow: 0 4px 24px -8px rgba(0,0,0,0.2)` + `backdrop-filter: blur(4px)`): Reserved for cards that float independently in a list (Subreddit cards only). Not the default; don't reach for this on grouped/settings-style content.

### Named Rules
**The Ring-Not-Shadow Rule.** Default elevation is a 1px inset border-ring, not a drop shadow. If a new panel needs to signal "this is a container," reach for the ring first; a floating shadow is the deliberate exception for standalone list cards, not the norm.

## 5. Components

Precise and quiet: every interactive element is understated at rest and confirms itself unmistakably on hover/focus/selection, with zero unnecessary flourish in between.

### Buttons
- **Shape:** Rounded corners at the base radius (0.535rem / `rounded-lg`).
- **Primary:** Inverted fill — Signal White background, Void Teal text (`bg-primary text-primary-foreground`), height 32px (`h-8`), horizontal padding 10px. Hover dims to 80% opacity of the same fill — no color shift, no border change.
- **Outline:** Transparent background, Moss Panel border, Signal White text. Hover fills to a faint Moss Panel wash.
- **Ghost:** No border, no fill at rest; hover fills to the same faint Moss Panel wash as Outline.
- **Destructive:** Clay Alert at ~10% opacity as background, full-opacity Clay Alert text — never a solid red button. Hover deepens the wash to ~20%.
- **Sizes:** `xs` (24px) / `sm` (28px) / default (32px) / `lg` (36px), plus square icon-only variants at matching heights.

### Cards / Containers
- **Corner Style:** 0.749rem (`rounded-xl`) for grouped panels and floating list cards; 0.535rem (`rounded-lg`) for onboarding option cards.
- **Background:** Void Teal — identical to the page background; containers are visually "cut into" the field by their ring, not lifted off it by a lighter fill.
- **Shadow Strategy:** Ring-rest at rest, Ring-selected on hover/selection (see Elevation). Only the Subreddit card uses Ambient-float instead.
- **Border:** None as a literal border — the inset ring shadow does this job instead, so corners stay crisp with no double-edge artifact.
- **Internal Padding:** 16px default (24-32px on larger settings panels).

### Inputs / Fields
- **Style:** Either a bordered field matching Button Outline's treatment (rounded, Moss Panel border, transparent fill), or — in onboarding and settings forms — a borderless underline field (`border-b border-border`, transparent background) that reserves the bordered style for shorter, denser forms.
- **Focus:** Border shifts to Field Sage, with a soft 3px ring at low opacity (`focus-visible:ring-3 ring-ring/50`).
- **Error:** Border and ring shift to Clay Alert at low opacity, matching the Soft Alert Rule.

### Navigation
- **Style:** Fixed-width sidebar (240px desktop) with icon + label rows; the active row gets a 3px Field Sage rail on its leading edge plus a faint Moss Panel fill — the one place a literal left-edge accent stripe is intentional (it's a nav-selection indicator, not a card/callout accent). Mobile collapses to a 6-column icon-only bottom bar plus a compact top bar for the project switcher and account link.
- **Typography:** Nav labels are body-weight sans, not mono-label — the mono-label voice is reserved for meta/status text, not primary navigation.

### Phase Tracker (signature component)
A vertical stepper used across onboarding and multi-step flows: a thin vertical rule with a Field Sage fill that grows to the active step, a pulsing-ring dot per active phase, and a mono-label "PHASE 0N" caption above each step's sans-serif title. This is the system's clearest embodiment of the Listening Node metaphor — literally visualizing "the instrument moving through a sequence" — and should be reused for any future multi-step flow (This Week's task list, Outreach's draft-to-sent flow) rather than inventing a second stepper pattern.

### Topographic Field (signature component)
A fixed, full-viewport SVG contour-line texture (`.auth-topo`), masked to a soft radial fade and given a slow 60s linear drift animation, layered under every authenticated screen and the onboarding flow. This is the one purely atmospheric device in the system — it exists to reinforce "listening/scanning" without competing with foreground content, and should never be adapted into a louder or faster-moving variant.

## 6. Do's and Don'ts

### Do:
- **Do** keep Field Sage as the only saturated color on any given screen — it marks the one active/selected/emphasized thing, nothing else.
- **Do** use the 1px inset ring (Ring-rest → Ring-selected) as the default way to define a container's edge; reach for a drop shadow only for a standalone floating list card.
- **Do** set any label, caption, or status text under 12px in Source Code Pro, uppercase, 0.15em tracking — this is the system's signature device.
- **Do** use the Soft Alert treatment (tinted wash, not solid fill) for every destructive/error state.
- **Do** reuse the Phase Tracker pattern for any new multi-step flow rather than inventing a second stepper.

### Don't:
- **Don't** introduce a second accent hue. If a screen feels like it needs more color, that's a hierarchy problem to solve with weight/size/space, not a new hue.
- **Don't** ship the generic SaaS-cream dashboard look — warm off-white surfaces, identical icon-heading-text card grids, or a gradient hero-metric block. This system is dark, quiet, and precise by explicit design decision, not by default.
- **Don't** use the tiny mono-uppercase label as a decorative per-section marketing eyebrow ("ABOUT / PROCESS / PRICING" above every block). Its job here is functional labeling (fields, status, phase state); reintroducing it as landing-page scaffolding is a different, banned pattern.
- **Don't** use a solid, full-opacity Clay Alert fill for any destructive button or banner — always the tinted wash.
- **Don't** add mascots, illustration, or exclamation-heavy copy anywhere in the product; the tone is a capable, calm instrument, not a consumer toy.
- **Don't** reach for a corporate navy-and-gray enterprise treatment when a new B2B-feeling surface (e.g. Outreach, a future admin view) is added — stay inside the Void Teal / Signal White / Field Sage palette.
