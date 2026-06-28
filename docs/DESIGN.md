---
name: Lyra Ecosystem
colors:
  surface: '#0f1415'
  surface-dim: '#0f1415'
  surface-bright: '#343a3b'
  surface-container-lowest: '#090f10'
  surface-container-low: '#171d1e'
  surface-container: '#1b2122'
  surface-container-high: '#252b2c'
  surface-container-highest: '#303637'
  on-surface: '#dee3e4'
  on-surface-variant: '#bcc9cb'
  inverse-surface: '#dee3e4'
  inverse-on-surface: '#2b3132'
  outline: '#869395'
  outline-variant: '#3d494b'
  surface-tint: '#5ed7e6'
  primary: '#5ed7e6'
  on-primary: '#00363c'
  primary-container: '#04a3b1'
  on-primary-container: '#003237'
  inverse-primary: '#006972'
  secondary: '#a3ced3'
  on-secondary: '#05363b'
  secondary-container: '#234d52'
  on-secondary-container: '#92bcc2'
  tertiary: '#ffb785'
  on-tertiary: '#502500'
  tertiary-container: '#d37f3f'
  on-tertiary-container: '#4a2100'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#8df2ff'
  primary-fixed-dim: '#5ed7e6'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#004f56'
  secondary-fixed: '#bfeaf0'
  secondary-fixed-dim: '#a3ced3'
  on-secondary-fixed: '#001f23'
  on-secondary-fixed-variant: '#234d52'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb785'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#0f1415'
  on-background: '#dee3e4'
  surface-variant: '#303637'
typography:
  display-lg:
    fontFamily: Dm Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Dm Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Dm Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Dm Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Dm Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  2xl: 1rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

The design system is engineered for a holistic personal companion application that harmonizes productivity, habit tracking, and spiritual growth (Islamic life). The aesthetic relies on **Calm Minimalism** with **Focused Highlights**, establishing a serene, distraction-free environment that supports daily routines and deep focus.

By utilizing a "Dark Mode First" philosophy, the UI minimizes eye strain and recedes into the background. The app is structured to feel like a quiet, organized space, using subtle tonal shifts for hierarchy rather than aggressive borders or heavy drop shadows. 

## Colors

The palette utilizes a deep, oceanic-industrial base to create a sense of digital depth, while relying on distinct semantic accents to categorize different aspects of the user's life.

* **Lyra Cyan (`#04A3B1` / `primary-container`):** The primary brand signal. Used for high-intent actions (e.g., "Get Started", "Continue" buttons), active navigation states, and primary text links.
* **Deep Surface (`#0f1415` base, `#1b2122` cards):** The neutral foundation. Layering slightly lighter surface tones over the deep background creates structured dashboard widgets without visual clutter.
* **Semantic Accents:** Used sparingly within icons and progress states to quickly convey meaning:
    * **Habits:** Warm Ember/Orange (e.g., the flame icon).
    * **Prayers:** Soft Indigo/Purple (e.g., the crescent moon icon).
    * **Tasks & Success:** Muted Green (e.g., checkmarks and completion states).
    * **Islamic Life/Deeds:** Gold/Yellow (e.g., the star icon).

## Typography

The typography strategy relies on the monolinear precision of geometric and technical typefaces to convey a sense of modern organization, with built-in considerations for bilingual (English/Arabic) content.

* **Display & Headings:** *DM Sans* is used for page titles (e.g., "Good morning"), welcoming headers ("Welcome to Lyra"), and prominent UI messaging. It provides a structured, modern feel.
* **UI & Content:** *Geist* serves as the functional workhorse for dashboard metrics, secondary text, and input fields, ensuring maximum legibility at smaller sizes.
* **Localization:** Given the application's focus on Islamic life and regional relevance, typography must seamlessly support Arabic scaling (e.g., *Noto Naskh Arabic*), maintaining optical balance alongside the Latin typefaces.

## Layout & Spacing

This design system employs a **Fluid Grid** model with a consistent application shell structure.

* **Application Shell:**
    * **Sidebar:** A persistent left-hand navigation pane housing core modules (Today, Tasks, Habits, Calendar, Prayers, Focus, Islamic Life). Active states are highlighted with a subtle `Lyra Cyan` background pill.
    * **Main Content Area:** A central, scrollable canvas that uses generous vertical spacing (`lg` or `xl`) between dashboard sections to maintain a breathable layout.
* **Dashboard Grid:** The "Today" view utilizes a responsive grid system, placing high-level metric cards (Tasks done, Habits, Prayers, Focus today) in a top row, followed by expansive, multi-column detailed widgets below.

## Elevation & Depth

Hierarchy is established entirely through **Tonal Layering** rather than aggressive shadows. 

1.  **Level 0 (Base):** The main application background (`#0f1415`).
2.  **Level 1 (Surface):** The core dashboard cards and onboarding modals. These use a slightly lighter shade (`#1b2122` or `surface-container`) to lift off the background.
3.  **Level 2 (Interaction/Input):** Form fields and active inputs use an inset look (darker background) with a subtle 1px border.

**Outlines:** Borders are nearly invisible, using `outline-variant` (`#3d494b`) merely to suggest structure on dense dashboard widgets, ensuring the interface remains soft.

## Shapes

The shape language leans toward **Soft & Friendly** to balance the technical dark mode with a personal, companionable feel.

* **Primary Elements:** Buttons and input fields use a medium radius `md` (6px) or `lg` (8px) for a polished, modern look.
* **Containers & Cards:** Dashboard widgets and onboarding modals utilize a generous `2xl` (16px) or larger corner radius. This significant rounding creates a distinct "card" feel that separates functional modules from the main background.
* **Progress Indicators:** Segmented progress bars (like those in the onboarding flow) use fully rounded pill shapes (`full`).

## Components

* **Buttons:**
    * *Primary:* Solid `Lyra Cyan` (`primary-container`) with dark text. Fully rounded corners or `lg` radius. Used for main progression.
    * *Secondary/Action:* Text-based links (e.g., "Skip for now", "View all >") colored in muted text or primary cyan depending on emphasis.
* **Input Fields:** Dark background (inset look) with a subtle, thin outline. Labels sit above the field in a muted, small typeface.
* **Dashboard Cards (Widgets):** Background: Level 1 Surface. Heavily rounded corners. Headers are separated from the content area, featuring the section title on the left and actionable links ("View all", "Update") on the right.
* **Metric Blocks:** Small, top-level dashboard blocks (e.g., "0 / 0 Tasks done") that stack an icon, title, and large numeric value. 
* **Navigation Sidebar:** Items feature a left-aligned icon and text. The active state uses a low-opacity cyan fill with cyan text to indicate selection without overpowering the screen.
