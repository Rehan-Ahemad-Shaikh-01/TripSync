# Landing Page Design System (CoreShift-style)

Reference spec extracted from a landing-page walkthrough video. Written for an AI coding agent to implement a visually identical system — not just a copy of one page, but a reusable design language.

---

## 1. Core Concept

The entire site lives **inside one large rounded "frame" card** that sits on a neutral backdrop, like a device screenshot:

- Outer page background: light neutral gray (`#E7E8EA`–`#ECECEF`).
- Inside it, a single container: white, `border-radius: 32px`, generous side margins (~20–24px), soft drop shadow. All sections (hero, features, integrations, testimonials, footer) stack inside this one rounded card — the gray backdrop only ever peeks around its edges.
- The navbar floats **inside** the top of that frame as its own pill, not full-width.

```css
body { background: #ECECEF; }

.page-frame {
  max-width: 1280px;
  margin: 24px auto;
  background: #ffffff;
  border-radius: 32px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08);
  overflow: hidden;
}
```

---

## 2. Color Tokens

| Token | Value | Use |
|---|---|---|
| `--bg-page` | `#ECECEF` | outer backdrop |
| `--bg-surface` | `#FFFFFF` | frame + cards |
| `--bg-section-alt` | `#F5F5F7` | alternating section fills inside frame |
| `--text-primary` | `#0A0A0A` | headings |
| `--text-secondary` | `#6B7280` | subtext/body |
| `--accent-purple` | `#8B5CF6` → `#7C3AED` gradient | primary brand accent, icon tiles, CTA gradient |
| `--accent-coral` | `#F2603C` → `#EF4444` gradient | primary CTA button, alert icon tiles |
| `--accent-yellow` | `#FFD84D` | icon tile |
| `--accent-cyan` | `#4FC3E8` | icon tile |
| `--accent-black` | `#0A0A0A` | secondary button (nav "Request a Demo") |
| `--star-yellow` | `#FBBF24` | rating stars |

Each feature/benefit icon sits in its own colored "squircle" tile (rounded-2xl, ~64–72px, solid flat accent color, white line icon centered) — purple, coral, yellow, cyan are rotated across sections so no two adjacent tiles share a color.

---

## 3. Typography

- Font family: geometric grotesk sans-serif (e.g. **General Sans**, **Inter**, or **Satoshi** as a substitute).
- Headings: **black/extrabold weight (800–900)**, tight line-height (~1.05), large scale — hero H1 ~56–72px, section H2 ~36–44px.
- Body/subtext: regular weight, `--text-secondary`, comfortable line-height (~1.6), 16–18px.
- Nav links: medium weight, 14–15px, `--text-primary` at ~80% opacity.
- Footer brand name is repeated as a **giant outlined/oversized wordmark** bleeding off the bottom edge of the frame as a decorative watermark.

```css
h1, h2, h3 { font-family: 'General Sans', 'Inter', sans-serif; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary); }
p { color: var(--text-secondary); font-weight: 400; }
```

---

## 4. Components

### Navbar

A compact floating pill that sits **inside** the top of the page frame (not full-width).

- **Container**: `border-radius: 999px`, white background (`#FFFFFF`), soft drop shadow, `padding: 8px 12px 8px 16px`, `max-width: 880px`, centered horizontally.
- **Layout** (single-row, 3-column grid `auto 1fr auto`):
  - **Left** – Brand logo: a small 2×2 dot-grid icon (`•• `) followed by a bold wordmark in `--text-primary`.
  - **Center** – Nav links: 4–5 items (`Product`, `Features`, `Pricing`, `Resources`), medium weight, 14–15px, `--text-primary` at ~80% opacity, evenly spaced with `gap: 8px`.
  - **Right** – Two CTA buttons side-by-side with `gap: 8px`:
    - **`Sign In`** — ghost/light-gray pill: `background: #F3F4F6`, `color: #0A0A0A`, `border-radius: 999px`, `padding: 10px 20px`, no border. Hover: slightly darker fill.
    - **`Request a Demo`** — solid black pill: `background: #0A0A0A`, `color: #FFFFFF`, `border-radius: 999px`, `padding: 10px 22px`, `font-weight: 700`. Hover: `background: #1A1A1A`, scale `1.02`.

```css
/* Navbar pill */
.nav-pill {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;
  background: #ffffff;
  border-radius: 999px;
  padding: 8px 12px 8px 16px;
  max-width: 880px;
  margin: 16px auto 0;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}

.nav-links {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.nav-links a {
  font-size: 14px;
  font-weight: 500;
  color: rgba(10,10,10,0.75);
  padding: 6px 10px;
  border-radius: 999px;
  text-decoration: none;
  transition: color 0.2s;
}
.nav-links a:hover { color: #0A0A0A; }

.nav-ctas { display: flex; gap: 8px; align-items: center; }

/* Sign In – ghost */
.btn-ghost-nav {
  background: #F3F4F6;
  color: #0A0A0A;
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.btn-ghost-nav:hover { background: #E5E7EB; transform: scale(1.02); }

/* Request a Demo – solid black */
.btn-dark-nav {
  background: #0A0A0A;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.btn-dark-nav:hover { background: #1A1A1A; transform: scale(1.02); }
```

---

### Buttons

All buttons share: `border-radius: 999px`, bold white text, `padding: 14px 32px` (default size), hover `scale(1.03)`, `transition: 0.2s ease`.

The key visual detail in the reference photos is a **colored glow drop-shadow** beneath each button that matches its fill color — this creates a subtle 3D lift / floating-off-surface depth effect.

#### Primary CTA — Coral/Red-Orange (`btn-coral`)

Used for main calls-to-action, e.g. **"Request a Demo"**.

- **Background**: solid coral-orange — `#E8432D` (or gradient `linear-gradient(135deg, #F2603C, #E03020)` for richness).
- **Text**: `#FFFFFF`, `font-weight: 700`.
- **Glow shadow**: `box-shadow: 0 8px 24px rgba(232, 67, 45, 0.55)` — a warm red bloom directly beneath the pill.
- **Hover**: `box-shadow: 0 12px 32px rgba(232, 67, 45, 0.7)`, `transform: scale(1.03) translateY(-1px)`.

```css
.btn-coral {
  background: #E8432D;
  background: linear-gradient(135deg, #F2603C 0%, #E03020 100%);
  color: #ffffff;
  font-weight: 700;
  border: none;
  border-radius: 999px;
  padding: 14px 32px;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(232, 67, 45, 0.55);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.btn-coral:hover {
  box-shadow: 0 12px 36px rgba(232, 67, 45, 0.7);
  transform: scale(1.03) translateY(-2px);
}
```

#### Secondary CTA — Purple (`btn-purple`)

Used inline in content cards and sections, e.g. **"Learn more"**.

- **Background**: solid violet-purple — `#7B5CF0` (or gradient `linear-gradient(135deg, #9B7BF7, #6B46E8)` for depth).
- **Text**: `#FFFFFF`, `font-weight: 700`.
- **Glow shadow**: `box-shadow: 0 8px 24px rgba(123, 92, 240, 0.55)` — a cool purple bloom.
- **Hover**: `box-shadow: 0 12px 32px rgba(123, 92, 240, 0.7)`, `transform: scale(1.03) translateY(-1px)`.

```css
.btn-purple {
  background: #7B5CF0;
  background: linear-gradient(135deg, #9B7BF7 0%, #6B46E8 100%);
  color: #ffffff;
  font-weight: 700;
  border: none;
  border-radius: 999px;
  padding: 14px 32px;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(123, 92, 240, 0.55);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.btn-purple:hover {
  box-shadow: 0 12px 36px rgba(123, 92, 240, 0.7);
  transform: scale(1.03) translateY(-2px);
}
```

#### Nav Dark Pill (`btn-dark`) — used inside the Navbar

- Solid `#0A0A0A`, white text, smaller size (`padding: 10px 22px`, `font-size: 14px`).
- No colored glow — just a faint neutral shadow matching the nav pill itself.

#### Sign In Ghost (`btn-ghost-nav`) — used inside the Navbar

- `background: #F3F4F6`, dark text, same small size. No glow.

### Icon Tile
```css
.icon-tile {
  width: 64px; height: 64px;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  color: white;
}
```

### Feature Card
- White (or `--bg-section-alt`) rounded rectangle (`border-radius: 24px`), padding ~32px.
- Small icon tile top-left, bold heading below it, gray description text below that.
- Grid of 2–3 columns; taller "hero" cards can span with a screenshot/UI mock illustration above the text.

### Floating Photo Collage (hero)
- Portrait photo tiles (rounded corners, white border, small drop shadow) scattered asymmetrically left/right of the central heading, connecting nodes/dots drawn as thin lines between colored icon tiles — a "network diagram" motif for the very top hero.

### Testimonial Card
- Centered white rounded card (`border-radius: 24px`) on a plain section background.
- Circular avatar photo, name (bold) + role (gray, smaller) beneath, 5-star yellow rating row, italicized quote text, prev/next circular nav arrows below.
- Two large decorative "ghost" cards peek in from off-screen left/right, tilted, mostly faded — implies a carousel.

### Integration Grid
- 5 flat gray rounded squares, each holding a third-party logo (Gmail, Zapier, Google Meet, Outlook, Teams), tiles are gently rotated at alternating angles (±4–8°) for a casual scattered layout. Center tile gets a label + description beneath it.

### Footer
- Sits inside the same white frame, standard column layout (brand blurb / Product / Features / Pricing / Resources / social icons).
- Below the columns, a **huge outline wordmark** of the brand name is clipped by the bottom edge of the frame as a background flourish.

---

## 5. Motion & Smooth Scroll

The whole page uses **inertial/smoothed scrolling** (not native scroll) combined with a **directional blur-wipe reveal** on text and images as sections transition — content doesn't just fade, it slides slightly and motion-blurs, as if the scroll velocity is smearing it, then sharpens to rest.

### 5.1 Smooth scroll setup (Lenis)

```bash
npm install lenis
```

```js
import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.2,          // higher = "floatier" inertia
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,      // keep native touch scroll on mobile
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

If using GSAP ScrollTrigger alongside Lenis, sync them:

```js
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

### 5.2 Scroll-blur reveal on text/images

Each heading/image that enters/exits viewport gets a `filter: blur()` + slight vertical offset tied to scroll velocity or scroll progress, so it looks like it's "swiping" into focus.

```css
.reveal {
  filter: blur(8px);
  opacity: 0;
  transform: translateY(24px);
  transition: filter 0.6s ease, opacity 0.6s ease, transform 0.6s ease;
}
.reveal.in-view {
  filter: blur(0px);
  opacity: 1;
  transform: translateY(0);
}
```

```js
// Trigger .in-view with an IntersectionObserver (simple) ...
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting));
}, { threshold: 0.4 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// ...or tie blur amount directly to Lenis scroll velocity for the
// exact "motion smear" look seen in the reference video:
lenis.on('scroll', ({ velocity }) => {
  const blur = Math.min(Math.abs(velocity) * 1.2, 10);
  document.querySelectorAll('.velocity-blur').forEach((el) => {
    el.style.filter = `blur(${blur}px)`;
  });
});
```

Apply `.velocity-blur` to large headings and the scattered hero photos specifically — that's where the effect reads most strongly in the reference (word "solutions" and the floating portraits blur mid-transition, then snap sharp at rest).

### 5.3 Section transitions
- Sections crossfade/slide in as the frame scrolls — no hard cuts.
- Hover states: buttons scale ~1.03–1.05 with `transition: 0.2s ease`; cards lift with a slightly deeper shadow.

---

## 6. Implementation Notes for AI Agents

- **Stack suggestion**: Next.js/React + Tailwind CSS for layout/tokens, Lenis for smooth scroll, GSAP ScrollTrigger (or Framer Motion `useScroll`) for the blur-reveal choreography.
- Keep the **single rounded frame** as the top-level layout wrapper — every section is a child of it, not a full-bleed `<section>` on `body`.
- Reuse the 4-color accent rotation (purple / coral / yellow / cyan) consistently across icon tiles so no section feels monochrome or clashing.
- Keep corner radii large and consistent: `999px` for pills/buttons, `24–32px` for cards/frame, `18px` for icon tiles — this rounded-everything language is central to the aesthetic.
- Favor whitespace and large type over dense information — sections are sparse, one idea each.
