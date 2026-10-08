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
  display-close:
    fontFamily: "Geist, Public Sans, system-ui, sans-serif"
    fontSize: "clamp(36px, 5vw, 80px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, Public Sans, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.4vw, 64px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  lede:
    fontFamily: "Geist, Public Sans, system-ui, sans-serif"
    fontSize: "clamp(22px, 2vw, 30px)"
    fontWeight: 450
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title-display:
    fontFamily: "Geist, Public Sans, system-ui, sans-serif"
    fontSize: "clamp(18px, 1.6vw, 24px)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  body-dense:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
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
  home-search:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.slate-secondary}"
    rounded: "{rounded.sm}"
    padding: "0 12px 0 16px"
    height: "60px"
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
  home-close-band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "112px 32px"
---

# Design System: BuySub

## Overview

**Creative North Star: "The Ruled Shopfront"**

BuySub is a shop first. The home page proves it by running the real shop inside a phone on a ruled grid, and every other surface (catalog, cart, account, partner portal, admin console) is a calm, neutral working tool built from one token set. The ground is light paper, structure comes from 1px rules and tonal steps rather than shadow, and colour is rationed: violet marks what to press or what is selected, and the only other saturated colour on a page is a third-party brand's own.

Two registers share the same tokens. The app register (Public Sans, rounded cards at 16 to 20px, 48px controls) is dense, legible and quiet. The home register adds a Geist display face set tight and large, a visible ruled grid with an ink cross where rules meet, tighter corners (4 to 10px), and an inverse ink band to close. The home register is scoped to the home page; it is not a restyle of the app.

Confirmed rejections from the owner: no gradients, no glows, no eyebrows or kickers; sentence case everywhere; no em dashes in visible copy; violet never used as decoration. Light is the default theme; a dark theme exists for every route through `[data-theme]`.

**Key Characteristics:**
- Light paper ground (`paper`), white cards, ink text with a slight cool cast.
- Violet only on primary actions and active states.
- Depth by surface step and 1px border; shadows only for things that genuinely float.
- Public Sans for all text; Geist 500 only for home display type.
- Third-party services shown in their official brand colour (Simple Icons).

## Colors

A cool neutral paper-and-ink palette with one violet accent and brand colours borrowed from the services sold.

### Primary
- **BuySub Violet** (`violet`): the brand colour. On its own it marks state with no text on it: the active pager dot and its dashed ring, the selected tab underline, checked checkboxes, the focus ring (at 35% alpha).
- **Violet Fill** (`violet-fill`): violet adjusted to carry white text at AA (4.61:1). Every primary button, the skip link, any filled control with a label. Visually identical to Violet (dE 1.77).
- **Violet Hover** (`violet-hover`): primary button hover.
- **Violet Text** (`violet-text`): violet as text on light surfaces (6.76:1 on white). Raw Violet as text fails AA on white.

### Neutral
- **Paper** (`paper`): the page ground; also the text colour inside the inverse close band.
- **Card White** (`card-white`): cards, inputs, secondary buttons, the home search field.
- **Paper Elevated** (`paper-elevated`): hover fills, the media half of home category cards, table row hover.
- **Paper Muted** (`paper-muted`): the body of home category cards, count pills, skeletons.
- **Ink** (`ink`): primary text, the home search field's 1px border, the ink cross, the inverse close band's background.
- **Slate Secondary** (`slate-secondary`): secondary text, brand names under tiles, ghost buttons.
- **Slate Muted** (`slate-muted`): placeholders, metadata, inactive pager dots. The minimum readable tier; `--bs-text-faint` is decorative or disabled only.
- **Rule** (`rule`): every 1px border and the home grid's rules.
- **Rule Strong** (`rule-strong`): hover borders, the outlined home tag, the keyboard hint, link underlines at rest.

### Status
- **Success / Warning / Error** (`success`, `warning`, `error`): status only, never decoration. Badges use the opaque pre-flattened `--bs-badge-*-bg/-fg` pairs, never translucent tints. `rejected_pending` is a warning (action needed), not an error and never neutral grey.

### Named Rules
**The Violet Is A Verb Rule.** Violet (`--bs-accent` #7C5CFF) appears only on primary actions and active or selected states. If nothing on screen can be pressed or is selected, there is no violet on screen.

**The Their Colour Rule.** A third-party service appears in its official brand colour from Simple Icons with a white glyph (Snapchat: white ghost with a black outline). Never recolour a brand to violet or grey, and never redraw a brand Simple Icons does not carry; leave it out.

**The Flat Colour Rule.** No gradients and no glows, on any surface, in either theme. Separation comes from a surface step or a 1px rule.

## Typography

**Display Font:** Geist variable, self-hosted (`/fonts/Geist-Variable.woff2`), falling back to Public Sans
**Body Font:** Public Sans (with system-ui, -apple-system, Segoe UI, sans-serif)

**Character:** Geist at weight 500 with negative tracking gives the home page a compact, engineered headline voice; Public Sans is a neutral grotesque with tabular figures and a real ₦ glyph, which is why it carries every price and every word of UI.

### Hierarchy
- **Display** (Geist 500, clamp(44px, 6.2vw, 96px), 0.96, -0.04em): the home hero headline, two lines, balanced, max 15ch.
- **Display close** (Geist 500, clamp(36px, 5vw, 80px), 0.98, -0.04em): the inverse close band's headline, max 14ch.
- **Headline** (Geist 500, clamp(34px, 4.4vw, 64px), 1, -0.035em): home section titles.
- **Lede** (Geist 450, clamp(22px, 2vw, 30px), 1.15, -0.02em): the hero's rotating line.
- **Title display** (Geist 500, clamp(18px, 1.6vw, 24px), 1.15, -0.02em): home category card names.
- **Title** (Public Sans 700, 24px, 1.2): app page titles and KPI values. 20px for panel titles and prices, 17px for card titles.
- **Body** (Public Sans 400, 15px, 1.6): customer body copy; 14px in account and partner areas; prose at 40 to 75ch.
- **Body dense** (Public Sans 400, 13px, 1.4): admin body and table cells.
- **Label** (Public Sans 600, 14px, 1): buttons, tabs, active states. Badges and column headers at 11 to 12px, weight 500. Floor is 11px.

### Named Rules
**The Two Faces Rule.** Geist is the home page's display face and nothing else: headline, section titles, the rotating line, category names. Body copy, buttons, inputs, prices and every app surface stay in Public Sans.

**The Sentence Case Rule.** All copy is sentence case. No uppercase kickers, no eyebrow labels over headings, no em dashes in visible copy. A heading stands alone.

## Layout

The app is a centred column (max 1600px) with a responsive gutter of 16px, 24px from 768px and 32px from 1280px, on a strict 4px spacing grid (4, 8, 12, 16, 20, 24, 32, 48). Breakpoints are 640, 768, 1024 and 1280; 768 is the phone/desktop split for chrome, and tables become cards below it. The sticky site header is 64px.

The home page runs full width and every band sets its own gutter. From 1024px the hero is a two by two ruled grid, columns 2fr/1fr, the top row at least 500px tall and sized to leave the headline row in the first viewport: phone stage top left, rotating line and dot pager top right, headline bottom left, search and "Browse all" bottom right. Below 1024px it stacks headline, search, rotating line, then the phone stage (520px). Sections after the hero are bands of 64px vertical padding (96px from 1024px), each closed by a 1px rule, with a 40px gap from title row to content. Category cards run two columns, three from 1024px.

### Named Rules
**The Ruled Grid Rule.** On the home page, structure is drawn, not boxed: 1px `rule` lines divide the hero cells and close each band, and an ink cross (33px, 1px arms) marks the one point where the hero's rules meet, from 1024px up. The rules belong to the home register; app surfaces use cards and borders instead.

## Elevation & Depth

Flat by default. Surfaces separate by a tonal step (paper, white card, elevated, muted) and a 1px border. Shadows are reserved for things that float over the page (menus, drawers, modals) and for a few physical objects on the home page (the phone, the fanned logos in category cards), and as hover feedback on the search field. Focus is a 3px violet ring at 35% alpha, drawn as a box-shadow.

### Shadow Vocabulary
- **Elevation 1** (`box-shadow: 0 1px 3px rgba(0,0,0,0.06)`): rare; a resting lift on small floating items.
- **Elevation 2** (`box-shadow: 0 4px 12px rgba(0,0,0,0.08)`): dropdowns and popovers.
- **Elevation 3** (`box-shadow: 0 16px 40px rgba(0,0,0,0.12)`): drawers and modals.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(124,92,255,0.35)`): every keyboard focus.
- **Home object** (`box-shadow: 0 40px 80px -30px rgba(10,10,20,.45)`): the phone only.

### Named Rules
**The Surface Before Shadow Rule.** If a surface sits in the page, a tone step and a 1px border separate it. Reach for a shadow only when something truly floats over the page.

## Shapes

Two radius scopes on one scale. The app register rounds generously: controls and inputs at 10px, panels and line items at 12px, cards and modals at 16px (20px for storefront cards from 768px), badges at 6px. The home register is tighter and more drafted: the outlined tag and keyboard hint at 4px, the search field at 6px, category cards at 10px, with circles only for the pager dots and pills. Brand tiles are the one soft shape on the home page (28px on a 120px tile, 22px on 88px), matching an app icon. Borders are always 1px.

### Named Rules
**The Scope Rule.** Corner radius follows the register: home surfaces stay at 10px or under (brand tiles excepted); app cards stay at 16 to 20px. Do not mix a home card into the app or round the home grid's cells.

## Components

### Buttons
Solid, compact and unadorned.
- **Shape:** gently rounded (10px), 1px transparent border, 48px tall on customer surfaces (52px for the hero-level CTA, 32 to 40px for admin only).
- **Primary:** Violet Fill with white label text, Public Sans 600 14px, 20px side padding (24px at xl, 15px text).
- **Hover / Focus:** hover darkens to Violet Hover over 120ms; press nudges down 1px; focus shows the violet ring. Disabled at 45% opacity.
- **Secondary:** white with a `rule` border and ink text; hover steps to Paper Elevated with a Rule Strong border.
- **Ghost:** transparent, slate text; hover fills Paper Elevated and inks the text.
- **Text link (home):** ink, weight 500, underline offset 5px in Rule Strong, which darkens to the text colour on hover. Used for "Browse all products" and "Partner sign in".

### Chips and badges
- **Badge (app):** 22px tall, 6px radius, 1px `rule` border, 12px weight 500; status badges use opaque `--bs-badge-*` pairs with a 6px dot.
- **Tag (home):** 28px tall, 4px radius, 1px Rule Strong outline, ink 13px text, no fill. Carries counts such as "12 products".

### Cards / Containers
- **App card:** white, 1px `rule` border, 16px radius (20px for storefront cards from 768px), 20px padding (24px on desktop storefront). Interactive cards strengthen the border on hover.
- **Home category card:** 10px radius, no border; a 2:1 media half on Paper Elevated (4:3 under 640px) holding three fanned product logos, a 1px rule, then a Paper Muted body with the Geist name and a footer of tag plus arrow. Hover fans the outer logos wider.

### Inputs / Fields
- **App input:** white, 1px `rule` border, 10px radius, 48px tall, 15px text, slate-muted placeholder. Hover strengthens the border; focus turns the border violet and adds the ring; invalid turns the border error red.
- **Home search:** a button that opens the search palette. 60px tall, white, a 1px ink border and 6px radius, search icon, slate text, a 26px keyboard hint ("/") outlined in Rule Strong. Hover adds a soft drop shadow; focus adds the ring.

### Navigation
- **Site header:** sticky, 64px, page ground at 88% with a 12px backdrop blur and a 1px bottom rule. Nav buttons are 40px, 13px weight 600, slate text, transparent; hover or open fills Paper Elevated and inks the text. Tabs mark the selected item with a 2px violet underline and weight 600.

### Brand tile (home)
A 120px square (88px under 640px) at 28px radius, filled with the service's official hex, white Simple Icons glyph at 54px, a 6% inset hairline, the brand name below in 13px slate. Hover lifts 4px and tilts -3deg. Tiles run in one or two marquee rows (60s linear loop, the second reversed), pause on hover and focus, and become a static scrollable row under reduced motion. Each links to a shop search for that product, and a brand appears only while the catalog sells it.

### Dot pager (home)
28px hit targets; inactive dots are 6px Slate Muted, the active dot is violet with a 1px dashed violet ring. Vertical from 1024px, horizontal below.

### Inverse close band (home)
The last band reverses the page: ink background, paper text (paper on dark, ink on light, by token). Geist display-close headline on the left, 2fr/1fr from 1024px, with a 17px lede at 78% opacity, an xl primary button and an underlined text link on the right. 72px vertical padding, 112px from 1024px.

## Do's and Don'ts

### Do:
- **Do** use `--bs-accent-fill` (#7756FF) under any text and `--bs-accent` (#7C5CFF) for fills without text, rings and active marks.
- **Do** separate surfaces with a tone step and a 1px `--bs-border-default` rule before reaching for a shadow.
- **Do** keep customer controls at 48px or taller.
- **Do** set Geist only on home display type, at weight 500 (450 for the rotating line) and -0.02em to -0.04em tracking.
- **Do** show third-party services in their Simple Icons brand colour with a white glyph.
- **Do** render `rejected_pending` in the warning tone.
- **Do** honour reduced motion: entrances and the marquee stop, and the marquee becomes a scrollable row.

### Don't:
- **Don't** use gradients or glows, on any surface or in either theme.
- **Don't** put an eyebrow, kicker or uppercase label above a heading.
- **Don't** use violet for decoration, illustration, section backgrounds or tinted panels.
- **Don't** use title case or em dashes in visible copy.
- **Don't** use Geist for body text, buttons, prices or any app surface.
- **Don't** round home surfaces past 10px (brand tiles excepted) or square off app cards below 16px.
- **Don't** use `--bs-text-faint` for text someone has to read.
- **Don't** recolour or redraw a third-party brand mark.
