---
name: BuySub
description: Foreign subscriptions priced in Naira, set up by a real team.
colors:
  violet: "#7C5CFF"
  violet-fill: "#7756FF"
  violet-hover: "#6B4EE6"
  violet-text: "#5B3FD4"
  paper: "#F8F9FB"
  card-white: "#FFFFFF"
  paper-elevated: "#F1F3F5"
  paper-muted: "#E8EAED"
  ink: "#1A1A2E"
  slate-secondary: "#4A5568"
  slate-muted: "#66717F"
  rule: "#E2E5E9"
  rule-strong: "#D1D1D6"
  success: "#059669"
  warning: "#D97706"
  error: "#DC2626"
typography:
  display:
    fontFamily: "Geist, Public Sans, system-ui, sans-serif"
    fontSize: "clamp(44px, 6.2vw, 96px)"
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  display-closer:
    fontFamily: "Geist, Public Sans, system-ui, sans-serif"
    fontSize: "clamp(38px, 5vw, 76px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, Public Sans, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.4vw, 64px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  title-display:
    fontFamily: "Geist, Public Sans, system-ui, sans-serif"
    fontSize: "clamp(18px, 1.6vw, 24px)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Geist, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  body-dense:
    fontFamily: "Geist, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Geist, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  brand-tile: "28px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  band: "64px"
  band-wide: "96px"
components:
  button-primary:
    backgroundColor: "{colors.violet-fill}"
    textColor: "{colors.card-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.violet-hover}"
  button-primary-xl:
    backgroundColor: "{colors.violet-fill}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-elevated}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.slate-secondary}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "48px"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.xl}"
    padding: "20px"
  badge:
    textColor: "{colors.slate-secondary}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "22px"
  home-category-card:
    backgroundColor: "{colors.paper-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  home-tag:
    textColor: "{colors.ink}"
    rounded: "{rounded.xs}"
    padding: "0 8px"
    height: "28px"
  home-brand-tile:
    textColor: "{colors.card-white}"
    rounded: "{rounded.brand-tile}"
    size: "120px"
  home-closer:
    backgroundColor: "{colors.violet-fill}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "80px 64px"
---

# Design System: BuySub

## Overview

**Creative North Star: "The Ruled Shopfront"**

BuySub is a shop first. The home page proves it by running the real shop inside a phone on a ruled grid, and every other surface (catalog, cart, account, partner portal, admin console) is a calm, neutral working tool built from one token set. The ground is light paper, structure comes from 1px rules and tonal steps rather than shadow, and colour is rationed: violet marks what to press or what is selected, and the only other saturated colour on a page is a third-party brand's own.

Two registers share the same tokens. The app register (Geist at text sizes, rounded cards at 16 to 20px, 48px controls) is dense, legible and quiet. The home register adds a Geist display face set tight and large, a visible ruled grid with an ink cross where rules meet, tighter corners (4 to 10px), and a violet call-to-action card to close. The home register is scoped to the home page; it is not a restyle of the app.

Confirmed rejections from the owner: no gradients, no glows, no eyebrows or kickers; sentence case everywhere; no em dashes in visible copy; violet never used as decoration. Light is the default theme; a dark theme exists for every route through `[data-theme]`.

**Key Characteristics:**
- Light paper ground (`paper`), white cards, ink text with a slight cool cast.
- Violet only on primary actions and active states.
- Depth by surface step and 1px border; shadows only for things that genuinely float.
- Geist for everything; ₦ alone comes from Public Sans.
- Third-party services shown in their official brand colour (Simple Icons).

## Colors

A cool neutral paper-and-ink palette with one violet accent and brand colours borrowed from the services sold.

### Primary
- **BuySub Violet** (`violet`): the brand colour. On its own it marks state with no text on it: the selected payment row and the in-progress step in how it works, the selected tab underline, checked checkboxes, the focus ring (at 35% alpha).
- **Violet Fill** (`violet-fill`): violet adjusted to carry white text at AA (4.61:1). Every primary button, the skip link, any filled control with a label. Visually identical to Violet (dE 1.77).
- **Violet Hover** (`violet-hover`): primary button hover.
- **Violet Text** (`violet-text`): violet as text on light surfaces (6.76:1 on white). Raw Violet as text fails AA on white.

### Neutral
- **Paper** (`paper`): the page ground; also no longer used as text on Ink.
- **Card White** (`card-white`): cards, inputs, secondary buttons, the how-it-works rows, the closer's button.
- **Paper Elevated** (`paper-elevated`): hover fills, the media half of home category cards, table row hover.
- **Paper Muted** (`paper-muted`): the body of home category cards, count pills, skeletons.
- **Ink** (`ink`): primary text, the ink cross, the done mark in how it works.
- **Slate Secondary** (`slate-secondary`): secondary text, brand names under tiles, ghost buttons.
- **Slate Muted** (`slate-muted`): placeholders, metadata, step numbers. The minimum readable tier; `--bs-text-faint` is decorative or disabled only.
- **Rule** (`rule`): every 1px border and the home grid's rules.
- **Rule Strong** (`rule-strong`): hover borders, the outlined home tag, the keyboard hint, link underlines at rest.

### Status
- **Success / Warning / Error** (`success`, `warning`, `error`): status only, never decoration. Badges use the opaque pre-flattened `--bs-badge-*-bg/-fg` pairs, never translucent tints. `rejected_pending` is a warning (action needed), not an error and never neutral grey.

### Named Rules
**The Violet Is A Verb Rule.** Violet (`--bs-accent` #7C5CFF) appears only on primary actions and active or selected states. If nothing on screen can be pressed or is selected, there is no violet on screen.

**The Their Colour Rule.** A third-party service appears in its official brand colour from Simple Icons with a white glyph (Snapchat: white ghost with a black outline). Never recolour a brand to violet or grey, and never redraw a brand Simple Icons does not carry; leave it out.

**The Flat Colour Rule.** No gradients and no glows, on any surface, in either theme. Separation comes from a surface step or a 1px rule.

## Typography

**Font:** Geist variable, self-hosted (`/fonts/Geist-Variable.woff2`), for display and text alike
**₦ glyph:** Public Sans, loaded as a one-glyph subset; Geist has no ₦, so the browser takes it from the next face in the stack (then system-ui, -apple-system, Segoe UI, sans-serif)

**Character:** One family carries the whole site. At weight 500 with negative tracking Geist gives the home page a compact, engineered headline voice; at text sizes it is a clean, neutral grotesque with tabular figures for prices and tables.

### Hierarchy
- **Display** (Geist 500, clamp(44px, 6.2vw, 96px), 0.96, -0.04em): the home hero headline, two lines, balanced, max 15ch.
- **Display closer** (Geist 500, clamp(38px, 5vw, 76px), 0.98, -0.04em): the closing call to action's headline, max 12ch.
- **Headline** (Geist 500, clamp(34px, 4.4vw, 64px), 1, -0.035em): home section titles.
- **Title display** (Geist 500, clamp(18px, 1.6vw, 24px), 1.15, -0.02em): home category card names.
- **Title** (Geist 700, 24px, 1.2): app page titles and KPI values. 20px for panel titles and prices, 17px for card titles.
- **Body** (Geist 400, 15px, 1.6): customer body copy; 14px in account and partner areas; prose at 40 to 75ch.
- **Body dense** (Geist 400, 13px, 1.4): admin body and table cells.
- **Label** (Geist 600, 14px, 1): buttons, tabs, active states. Badges and column headers at 11 to 12px, weight 500. Floor is 11px.

### Named Rules
**The One Face Rule.** Geist sets every word on every surface. Display sizes (home headline, section titles, step numbers and titles, category names) use weight 500 at -0.02em to -0.04em; text sizes keep normal tracking. The only other face is Public Sans, and only for ₦.

**The Sentence Case Rule.** All copy is sentence case. No uppercase kickers, no eyebrow labels over headings, no em dashes in visible copy. A heading stands alone.

## Layout

The app is a centred column (max 1600px) with a responsive gutter of 16px, 24px from 768px and 32px from 1280px, on a strict 4px spacing grid (4, 8, 12, 16, 20, 24, 32, 48). Breakpoints are 640, 768, 1024 and 1280; 768 is the phone/desktop split for chrome, and tables become cards below it. The sticky site header is 64px.

The home page runs full width and every band sets its own gutter. From 1024px the hero is a ruled grid, columns 2fr/1fr, as tall as the first viewport (capped at 980px): the top left is left empty, the headline sits bottom left with 72px below it, and the phone stage spans the right column; the phone is sized to the viewport height (0.46×, at least 360px, within the column) so its lower part always runs off the fold. Below 1024px it stacks the headline, then the phone stage (560px). The marquee band also holds How it works, with no rule between them (one section): its title row, then three ruled columns (stacked below 900px), each a 232px Paper Muted panel holding a small piece of real UI, a Geist step number, title and body. The panels loop what they describe: a violet-bordered highlight steps through the price rows (6s) and moves the selected payment option down the list (8s), and the order track runs from in progress to done over 9s. Static under reduced motion. Sections after the hero are bands of 96px vertical padding (144px from 1024px), each closed by a 1px rule, with a 40px gap from title row to content. Category cards run two columns, three from 1024px.

### Named Rules
**The Ruled Grid Rule.** On the home page, structure is drawn, not boxed: 1px `rule` lines divide the hero cells and close each band, and an ink cross (33px, 1px arms) marks the one point where the hero's rules meet, from 1024px up. The rules belong to the home register; app surfaces use cards and borders instead.

## Elevation & Depth

Flat by default. Surfaces separate by a tonal step (paper, white card, elevated, muted) and a 1px border. Shadows are reserved for things that float over the page (menus, drawers, modals) and for a few physical objects on the home page (the tilted phone, the fanned logos in category cards). Focus is a 3px violet ring at 35% alpha, drawn as a box-shadow.

### Shadow Vocabulary
- **Elevation 1** (`box-shadow: 0 1px 3px rgba(0,0,0,0.06)`): rare; a resting lift on small floating items.
- **Elevation 2** (`box-shadow: 0 4px 12px rgba(0,0,0,0.08)`): dropdowns and popovers.
- **Elevation 3** (`box-shadow: 0 16px 40px rgba(0,0,0,0.12)`): drawers and modals.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(124,92,255,0.35)`): every keyboard focus.
- **Home object** (`box-shadow: 0 40px 80px -30px rgba(10,10,20,.45)`): the phone only.

### Named Rules
**The Surface Before Shadow Rule.** If a surface sits in the page, a tone step and a 1px border separate it. Reach for a shadow only when something truly floats over the page.

## Shapes

Two radius scopes on one scale. The app register rounds generously: controls and inputs at 10px, panels and line items at 12px, cards and modals at 16px (20px for storefront cards from 768px), badges at 6px. The home register is tighter and more drafted: the outlined tag at 4px, how-it-works rows at 8px, category cards and the closer card at 10px, with circles only for radio marks, step marks and pills. Brand tiles are the one soft shape on the home page (28px on a 120px tile, 22px on 88px), matching an app icon. Borders are always 1px.

### Named Rules
**The Scope Rule.** Corner radius follows the register: home surfaces stay at 10px or under (brand tiles excepted); app cards stay at 16 to 20px. Do not mix a home card into the app or round the home grid's cells.

## Components

### Buttons
Solid, compact and unadorned.
- **Shape:** gently rounded (10px), 1px transparent border, 48px tall on customer surfaces (52px for the hero-level CTA, 32 to 40px for admin only).
- **Primary:** Violet Fill with white label text, Geist 600 14px, 20px side padding (24px at xl, 15px text).
- **Hover / Focus:** hover darkens to Violet Hover over 120ms; press nudges down 1px; focus shows the violet ring. Disabled at 45% opacity.
- **Secondary:** white with a `rule` border and ink text; hover steps to Paper Elevated with a Rule Strong border.
- **Ghost:** transparent, slate text; hover fills Paper Elevated and inks the text.
- **Text link (home):** ink, weight 500, underline offset 5px in Rule Strong, which darkens to the text colour on hover. Used for "Browse all products" and "Partner sign in".

### Chips and badges
- **Badge (app):** 22px tall, 6px radius, 1px `rule` border, 12px weight 500; status badges use opaque `--bs-badge-*` pairs with a 6px dot.
- **Tag (home):** 28px tall, 4px radius, 1px Rule Strong outline, ink 13px text, no fill. Carries counts such as "12 products".

### Cards / Containers
- **App card:** white, 1px `rule` border, 16px radius (20px for storefront cards from 768px), 20px padding (24px on desktop storefront). Interactive cards strengthen the border on hover.
- **Home category card:** 10px radius, no border; a 2:1 media half on Paper Elevated (4:3 under 640px) holding three fanned product logos, a 1px rule, then a Paper Muted body with the Geist name and a footer of tag plus arrow. Hover and focus fan the outer logos wider and fill the body with Violet Fill, its text, tag and arrow turning white.

### Inputs / Fields
- **App input:** white, 1px `rule` border, 10px radius, 48px tall, 15px text, slate-muted placeholder. Hover strengthens the border; focus turns the border violet and adds the ring; invalid turns the border error red.

### Navigation
- **Site header:** sticky, 64px, page ground at 88% with a 12px backdrop blur and a 1px bottom rule. Nav buttons are 40px, 13px weight 600, slate text, transparent; hover or open fills Paper Elevated and inks the text. Tabs mark the selected item with a 2px violet underline and weight 600.

### Brand tile (home)
A 120px square (88px under 640px) at 28px radius, filled with the service's official hex, white Simple Icons glyph at 54px, a 6% inset hairline, the brand name below in 13px slate. Hover lifts 4px and tilts -3deg. Tiles run in one or two marquee rows (60s linear loop, the second reversed), pause on hover and focus, and become a static scrollable row under reduced motion. Each links to a shop search for that product, and a brand appears only while the catalog sells it.

### Closer (home)
The last section is the shopper's call to action: a Violet Fill card at 10px radius inset in the page gutters (96px section padding, 144px from 1024px; 80px/64px card padding). Left: the display-closer headline in white, a 17px white lede, a 52px white button with ink text ("Browse the shop") and an underlined white WhatsApp link. Right: orbit art standing in until a mascot exists: the white BuySub tile (28% radius, the tint logomark) on two thin white rings (the outer dashed and turning once in 90s), with up to six brand tiles of apps the catalog sells placed around it, tilted and bobbing gently (static under reduced motion). The art is 330px wide (180px below 1024px) so the card keeps the height it had with a benefits list. This is the one place violet is a surface, at the owner's request.

### Partner promo (kept for the partner landing page)
`components/partner/PartnerPromo.tsx`, not mounted. The section that closed the home page before the closer: a Paper Muted card with the partner headline, lede, "Become a partner" and "Partner sign in" buttons, a decorative referral-link field and three ruled steps.

## Do's and Don'ts

### Do:
- **Do** use `--bs-accent-fill` (#7756FF) under any text and `--bs-accent` (#7C5CFF) for fills without text, rings and active marks.
- **Do** separate surfaces with a tone step and a 1px `--bs-border-default` rule before reaching for a shadow.
- **Do** keep customer controls at 48px or taller.
- **Do** set home display type in Geist 500 at -0.02em to -0.04em tracking; text sizes keep normal tracking.
- **Do** show third-party services in their Simple Icons brand colour with a white glyph.
- **Do** render `rejected_pending` in the warning tone.
- **Do** honour reduced motion: entrances and the marquee stop, and the marquee becomes a scrollable row.

### Don't:
- **Don't** use gradients or glows, on any surface or in either theme.
- **Don't** put an eyebrow, kicker or uppercase label above a heading.
- **Don't** use violet for decoration, illustration, section backgrounds or tinted panels.
- **Don't** use title case or em dashes in visible copy.
- **Don't** round home surfaces past 10px (brand tiles excepted) or square off app cards below 16px.
- **Don't** use `--bs-text-faint` for text someone has to read.
- **Don't** recolour or redraw a third-party brand mark.
