# Handoff: SchoolMate Staff — Support-Staff Mobile App

## Overview
SchoolMate Staff is a mobile app for **non-teaching school staff** (bus drivers, cooks, watchmen, gardeners, sweepers, peons, clerks) at a school. It is designed for **low-digital-literacy users on Android phones**, so it is icon-first, large-tap-target, role-aware, fully bilingual-ready (4 languages), and motion-rich for legible feedback.

The prototype demonstrates eight screens wired into a single clickable flow:
**Splash → Login (role + language picker) → Home dashboard → Attendance (geo-fence check-in) → Roster → Leave → Tasks → Driver view → Profile**, with a persistent bottom tab bar and a light/dark theme toggle.

---

## About the Design Files
The files in this bundle are **design references created in HTML/React (via in-browser Babel)** — prototypes that show the intended look, motion, and behavior. **They are not production code to copy directly.**

The task is to **recreate these designs in the target codebase's environment**, using its established patterns and libraries. This app is clearly intended to ship as a **native mobile app** — the recommended target is **React Native (Expo)** with **react-native-reanimated** for the motion and **react-i18next** for localization. If a codebase already exists, follow its conventions instead. The HTML is structured to make this mapping easy: it is already componentized React with a token system, an icon set, an i18n dictionary, and per-screen files.

---

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, component styling, motion timings, and copy are all specified here and in the source files. Recreate the UI faithfully, mapping the CSS/React patterns onto the target platform's primitives (e.g. `View`/`Pressable`/`Animated` in RN). Exact pixel values are given in px; on RN treat them as density-independent points (dp).

---

## Tech Map (HTML prototype → production)
| Prototype | Production (recommended) |
|---|---|
| React 18 + inline Babel JSX | React Native + Expo (or existing app stack) |
| Inline `style={{}}` objects + token theme | RN `StyleSheet` + theme context, or NativeWind |
| CSS `@keyframes` + `Element.animate()` | react-native-reanimated 3 |
| Inline SVG `<Icon>` set | react-native-svg (same path data) or lucide-react-native |
| `window.tr()` + dictionary in `app/i18n.jsx` | react-i18next with the same key/value JSON |
| Pointer-drag swipe (Tasks) | react-native-gesture-handler `Swipeable`/`Pan` |
| Geo radar (faked) | expo-location + geofencing against duty-post coords |
| Local React state | Keep local; add server sync (attendance, leave, tasks) |

---

## Design Tokens

Tokens live in `app/theme.jsx` as `makeTheme(dark)`. Two complete themes (light + dark). **Light mode is the default.**

### Colors — Light
| Token | Hex | Use |
|---|---|---|
| `bg` | `#F2EEE4` | App background (warm cream paper) |
| `surface` | `#FFFFFF` | Cards |
| `surface2` | `#FBF9F3` | Subtle raised |
| `sunken` | `#EBE6D9` | Wells, tracks, inactive segments |
| `ink` | `#15231E` | Primary text |
| `inkSoft` | `#5E6E66` | Secondary text |
| `inkFaint` | `#94A199` | Tertiary / disabled |
| `line` | `rgba(21,35,30,0.08)` | Hairline borders |
| `lineStrong` | `rgba(21,35,30,0.14)` | Stronger borders |
| `primary` | `#0E5C4A` | Brand deep forest green |
| `primaryDim` | `#15735C` | Brand hover/gradient stop |
| `onPrimary` | `#FFFFFF` | Text on primary |
| `gold` | `#E7A92F` | Accent / CTA highlight |
| `goldSoft` | `#FBEAC2` | Gold tint backgrounds |
| `success` | `#2E9E6B` / soft `#D4EFE0` | Positive |
| `danger` | `#DA5347` / soft `#F8DAD5` | Negative / check-out |
| `warn` | `#E0922F` / soft `#FBE6C6` | Pending / caution |

### Colors — Dark
| Token | Hex |
|---|---|
| `bg` | `#0B1512` |
| `surface` | `#14241E` |
| `surface2` | `#1A2C25` |
| `sunken` | `#0E1B16` |
| `ink` | `#ECF3EF` |
| `inkSoft` | `#9CB0A7` |
| `inkFaint` | `#647A71` |
| `primary` | `#33BF9F` (brightened for contrast) |
| `gold` | `#F2C766` |
| `success` | `#45C589` · `danger` `#F0786C` · `warn` `#F0B560` |

### Role accents (`ROLES` in `theme.jsx`)
Each role has an `accent` + `accentSoft` and an icon. The app reskins to the logged-in role's accent (FAB, buttons, hero gradients, active nav).
| Role key | Label (EN) | Icon | Accent | Accent soft |
|---|---|---|---|---|
| `driver` | Bus Driver | `bus` | `#E08A3C` | `#FBE7CC` |
| `cook` | Cook | `pot` | `#DD5A4B` | `#FAD8D2` |
| `guard` | Watchman | `shield` | `#3B7FD4` | `#D2E2F7` |
| `gardener` | Gardener | `leaf` | `#4C9E55` | `#D6ECD6` |
| `sweeper` | Sweeper | `broom` | `#23A79C` | `#CCECE8` |
| `peon` | Peon | `bell` | `#8A6ED4` | `#E2D9F6` |
| `clerk` | Clerk | `doc` | `#5566CE` | `#D7DBF6` |

### Typography
- **Display / headings:** `Sora` (weights 400–800). Used for titles, numbers, hero text. Negative letter-spacing (-0.3 to -0.6) on large sizes.
- **Body / UI:** `Manrope` (weights 500–800). Labels, body, buttons, captions. Buttons/labels are weight 800.
- Scale in use: hero 26–30px/700 · screen title 21px/700 · card title 16–17px/700 · body 14–15px/600–800 · caption 12–13px/600 · micro-label 10.5–12px/800 (often UPPERCASE, letter-spacing 0.4–1.5).
- Tabular numerals on timers (`fontVariantNumeric: 'tabular-nums'`).

### Spacing & shape
- Base rhythm: **multiples of ~4** (gaps 8/10/11/14/16/18; screen padding 18–20px horizontal).
- Radii: buttons/inputs **16**, cards **20–22**, large cards **24–26**, pills **100** (full), icon buttons **12–15**, FAB **22**, phone screen **40**.
- Shadows (light): `shadow` = `0 1px 2px rgba(21,35,30,0.05), 0 8px 24px -8px rgba(21,35,30,0.16)`; `shadowLg` = `0 2px 6px rgba(21,35,30,0.06), 0 22px 50px -16px rgba(21,35,30,0.28)`. Colored CTAs add an accent-tinted glow `0 8px 22px -8px <accent>88`.
- Min tap target **44px**; primary buttons are **54px** tall; check-in button is a **184px** circle.

---

## Screens / Views

> The device frame in the prototype is a **400 × 858** phone canvas (status bar 38px, gesture bar 22px). On real devices use safe-area insets instead of fixed bars.

### 1. Splash
- **Purpose:** Brand moment while app boots; auto-advances to Login after ~2.2s (also tap-to-skip).
- **Layout:** Full-bleed radial green gradient (`#16735C → #0E5C4A → #093B30`). Centered logo with two staggered expanding pulse rings; wordmark "SchoolMate" (Sora 30/700, white) + "STAFF" (Manrope 14/800, gold, letter-spacing 3) below; three bouncing dots at the bottom. Two blurred drifting orbs in the background.
- **Motion:** Logo scales 0.6→1 + fades in (.8s); text rises 14px + fades (.7s, .35s delay); rings pulse on a 2s loop offset by .9s; dots bounce on a 1s loop.

### 2. Login
- **Purpose:** Pick role + language, enter phone, request OTP.
- **Layout (top→bottom):**
  - **Brand cap** (rounded-bottom 30px, green radial gradient, drifting gold orb): row with 46px logo + "SchoolMate Staff" / "Greenfield Public School", and a **language pill** on the right (globe icon + current language native name + chevron). Below: localized greeting "Welcome back 👋" (Sora 26/700) + subtitle.
  - **Language dropdown:** opens from the pill but is rendered at screen root (with a full-screen scrim behind) so it escapes the cap's `overflow:hidden`. Lists English / हिंदी / मराठी / தமிழ், selected row tinted + checkmark.
  - **Role grid:** 4-column grid of role tiles (icon + label). Selected tile fills with the role accent, lifts 2px, gains accent glow. Selecting a role does **not** submit — it sets which role's identity the session uses.
  - **Mobile number field:** 58px pill input, role-accent phone icon, "+91" prefix, editable number (default `98765 43210`).
  - **CTA:** full-width 54px primary button in the role accent — "Send OTP & continue" → enters the app (no real OTP screen in the prototype; wire one in production).
  - **Footer:** shield icon + "Secured by SchoolMate · No password needed".
- **All visible strings are localized** via `tr()`.

### 3. Home (tab)
- **Purpose:** Glanceable "what's my day" dashboard.
- **Layout:** Greeting bar (avatar + "Good morning, {first name}" + theme toggle + notification bell w/ badge), then a scroll column (gap 16, bottom padding 120 to clear the nav) of cards that stagger in (slide-up 16px, 65ms apart):
  1. **Hero "Today" card** — role-gradient (green when not checked in, role-accent when on duty). Shows date, "Morning Shift", a live status chip ("Not started" / "On duty"), TIMING (7:30–3:30) and DUTY POST columns. If not checked in → gold "Tap to check in" button; if checked in → a row "Checked in at {time}" + elapsed.
  2. **Stat trio** — three cards: hours-this-week progress **ring** (34/44), on-time streak (fire icon, "21 days"), leave days left (gift icon, "12 left").
  3. **Route card** *(driver role only)* — bus + route, "License expires in 24d" (danger) and "Fitness OK" (success) pills; taps to Driver view.
  4. **Pending tasks peek** — section header + "View all", two task cards.
  5. **Alert card** — gold, "Staff meeting at 4:00 PM".

### 4. Attendance (overlay, opened by FAB or hero button)
- **Purpose:** Geo-fenced check-in / check-out — the signature interaction.
- **Layout:** Back header; then:
  - **Geo radar** (188px) — concentric duty-fence rings, a center pin (duty post, role accent), and a "you" dot that is green inside range / red outside. While locating, a conic sweep rotates and a GPS chip reads "Locating you…"; when ready it reads "Inside duty zone" or "120 m away · move closer" with an accuracy figure.
  - **Demo range toggle** — segmented "In range / Out of range" (this is a prototype affordance; production derives range from real GPS).
  - **Big check-in button** — 184px circle, role-accent gradient with pulse rings when actionable; disabled (sunken, not-allowed) while locating or out of range. Tap → 650ms spinner → on check-in fires a **confetti burst** and flips to a red "Check out" state + starts the on-duty timer. Helper text under it explains current state.
  - **Today's log** card — timeline row(s): "Checked in · {time} · Inside duty zone".

### 5. Roster (tab)
- **Purpose:** See this week's shifts.
- **Layout:** Title; horizontal **week strip** of 7 day chips (Mon–Sun) — selected fills with role accent + glow, today is tagged "TODAY", off-days are muted, a dot marks working days. Below: a large **selected-day card** (role-gradient if working, else neutral with a coffee icon) showing shift name, HOURS, and NOTE; then a "Week at a glance" list of all 7 days. Sample week: Mon–Fri Morning 7:30–3:30 (Wed is Split), Sat Half day, Sun Off.

### 6. Leave (overlay)
- **Purpose:** Leave balances + request status.
- **Layout:** Header with a "+" (new request) button. Then:
  - **Balance trio** — three cards with rings: Casual (6 used/12), Sick (4/8), Earned (1/15), showing remaining in the ring center.
  - **"Request new leave"** soft button.
  - **Active request** card — "Casual leave · 2 days", "12–13 Jun · Family function", Pending pill, a progress bar, and a **4-step approval timeline**: Request submitted ✓ → Supervisor review ✓ → Principal approval (active, blinking) → Approved (todo). Bar animates to % complete on mount.
  - **History** list — past requests with Approved/Rejected pills.

### 7. Tasks (tab)
- **Purpose:** Daily duties; complete by swiping.
- **Layout:** Header ("{n} pending · swipe to complete"); a role-gradient **progress banner** with a done/total ring; then task cards. **Swipe a card right** (past 55% threshold) to complete — a green "Slide to complete → Release to complete" track shows behind, the card slides out and collapses, and it moves to a struck-through **Completed** section. Empty state = "Inbox zero!" with a big check. Sample tasks: Pre-trip bus inspection (Urgent), Refuel at depot pump (Urgent), Sanitize seats & handrails, Submit trip log sheet.

### 8. Driver (overlay, driver role)
- **Purpose:** Vehicle, license, and live trip management.
- **Layout:** Header with a call button; then:
  - **License banner** (warn) — "Driving licence expires in 24 days · DL-HR2620 · Renew before 26 Jun" + Renew button.
  - **Vehicle card** (role-gradient) — "HR-26-BX-4412", bus icon, three stat tiles: Capacity 32 seats / Fuel 78% / Fitness Valid.
  - **Trip control** card — status dot + "Morning pickup / Trip in progress"; **Start trip** → confetti + running `mm:ss` timer + "15 students onboard"; **End trip** to stop.
  - **Stops timeline** — "Route 7 · stops": 5 stops with done ✓ / next (highlighted) / todo states, times, and student counts.

### 9. Profile (tab)
- **Purpose:** Identity, documents, settings, language, sign out.
- **Layout:** **Identity card** — role-gradient header strip, 78px avatar, name "Ramesh Kumar", role pill, and Emp ID / Joined / Rating stats. Then sections:
  - **Documents** — Driving licence (Expiring), Aadhaar/ID (Verified), Employment contract (OK).
  - **Emergency contact** — name + green call button.
  - **Settings** — **Language** (opens a slide-up bottom sheet to pick among the 4 languages, applied app-wide), **Dark mode** toggle switch, Notifications.
  - **Sign out** (danger) + version string.

---

## Interactions & Behavior
- **Navigation model:** 4 bottom-tab destinations (Home, Roster, Tasks, Me/Profile) + a center **check-in FAB**. Attendance, Leave, and Driver are **overlays** (push-from-right transition, have a back button, hide the nav). Tabs use a fade-up transition.
- **Bottom nav:** frosted/blur bar floating 26px from bottom, 14px side insets, 26px radius. Active item uses role accent + heavier icon stroke. Center FAB is a 60px role-accent circle with a pulse ring.
- **Theme toggle:** sun/moon icon in Home greeting bar and Profile header, plus a switch in Settings. Flips the entire token set; status/gesture bar tint follows the active view.
- **Language:** chosen at Login or in Profile → Settings; applies app-wide immediately. Proper nouns (names, bus reg, school, dates) stay untranslated by design.
- **Entrance motion:** screens stagger their cards in with a transform-only slide (never opacity-to-0 as the resting state — see "Gotchas").
- **Confetti:** DOM particles on successful check-in and trip start. In RN, use a confetti lib or reanimated particle burst.
- **Swipe-to-complete:** pointer drag with a 55%-of-width commit threshold; snaps back if released early. Use gesture-handler in RN.
- **Live timers:** on-duty elapsed (Home/Attendance) and trip timer (Driver) tick every second via `setInterval`; format `Hh Mm` / `mm:ss`.

## State Management
All state is local React state in `App` (`app/app.jsx`), passed down via an `app` object. Production should keep UI state local and add a data layer for the persisted/server-backed pieces.
- `dark: bool` — theme
- `step: 'splash' | 'login'` — pre-auth step
- `authed: bool`
- `lang: 'en' | 'hi' | 'mr' | 'ta'` — also mirrored to `window.__appLang` so the global `tr()` resolves synchronously before render (replace with i18next provider)
- `roleKey` — selected role; drives all accenting and conditional cards
- `tab` — active bottom tab; `overlay` — active overlay screen (null when on a tab)
- `checkedIn: bool`, `checkInAt: timestamp`, `elapsed: string` — attendance/timer
- `tasks: []` — each `{ id, tkey, where|whereK, tmKey, byKey, priority, icon, done }` (text fields are i18n keys, not literals)
- **Triggers:** `checkIn/checkOut`, `completeTask(id)`, `toggleTheme`, `setLang`, `go(name)`, `logout`.
- **Data to wire server-side in production:** attendance punches (with GPS + geofence validation), roster, leave balances/requests/approval status, task list + completion, profile/documents, notifications.

---

## i18n
- Dictionary: `app/i18n.jsx` — four full locales (`en`, `hi`, `mr`, `ta`) keyed by short strings; `tr(key, vars)` does `{var}` interpolation and falls back to English then the raw key.
- **Port the dictionary directly** to react-i18next resource JSON (keys are already stable). Keep proper nouns out of translation.
- Hindi is polished; **Marathi & Tamil should get a native-speaker proofread** before production.
- **RTL not yet implemented** — if Urdu/Arabic are added later, mirror layouts and handle `I18nManager.isRTL`.

## Gotchas (learned while building — save yourself the debugging)
- **Never leave a flex child's resting state at `opacity:0`** gated on a JS/animation frame — if that frame is throttled (backgrounded, low-end), content stays invisible. The stagger here animates **transform only**; resting opacity is 1.
- **`overflow:hidden` on a flex-column child** collapses it via `min-height:0` — cards that clip their content (identity card, geo radar, brand cap) must also set `flex-shrink:0`, or they shrink to a sliver. This bit us on the Profile identity card.
- **Dropdowns/sheets inside an `overflow:hidden` container** must render at screen root with a scrim, not inside the clipped parent.
- Give every shared style object a **unique name** — in the prototype this was a Babel-scope constraint; in RN use `StyleSheet.create` per component.

---

## Assets
- **No external image assets.** All iconography is an inline single-stroke SVG set in `app/icons.jsx` (~50 icons: home, calendar, clock, tasks, user, bus, pot, shield, leaf, broom, bell, doc, pin, gps, check, etc.). Reuse the same path data with react-native-svg, or swap to an equivalent line-icon library (lucide) matching 1.8–2.2 stroke weight.
- **Logo** is inline SVG (open-book/roof monogram in a green rounded square with a gold check badge) — see `Logo` in `app/screens-auth.jsx`.
- **Fonts:** Sora + Manrope (Google Fonts) — bundle the families in the app.
- All people/data (Ramesh Kumar, Greenfield Public School, bus HR-26-BX-4412, routes, phone numbers) are **placeholder content** — replace with real data sources.

---

## Files
In this bundle (under `design_handoff_schoolmate_staff/`):
- `SchoolMate Staff.html` — entry point: fonts, global keyframes, script load order, device frame.
- `app/theme.jsx` — **design tokens** (`makeTheme`), `ROLES`, `useStagger` motion hook.
- `app/i18n.jsx` — **all translations** + `tr()`.
- `app/icons.jsx` — inline SVG icon set + `<Icon>`.
- `app/ui.jsx` — shared primitives: StatusBar, GestureBar, Btn, IconBtn, Card, Avatar, RolePill, Pill, Ring, Skeleton, SectionLabel, Header, `burstConfetti`.
- `app/screens-auth.jsx` — Splash, Login, Logo.
- `app/screens-home.jsx` — Home dashboard.
- `app/screens-attendance.jsx` — Attendance + geo radar + check-in button.
- `app/screens-work.jsx` — Roster, Leave, Tasks (swipe).
- `app/screens-driver-profile.jsx` — Driver, Profile (+ language sheet).
- `app/app.jsx` — app shell, state, navigation, bottom nav, transitions.

To preview the reference: open `SchoolMate Staff.html` in a browser (needs internet for the two web fonts). Pick a role at login and toggle dark mode (top-right) to see the full system.
