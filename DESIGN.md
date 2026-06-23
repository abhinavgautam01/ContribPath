# DESIGN.md — ContribPath Aesthetic & Interaction System

This document outlines the design language, UI tokens, and interaction guidelines for ContribPath. The goal is to create a bespoke, premium, and highly tactile experience that feels like a next-generation developer tool, moving away from generic templates or "AI-generated" aesthetics.

---

## 1. Core Aesthetic: "Obsidian & Neon"

The visual language is rooted in a deep, cinematic dark mode. It uses depth, subtle glowing accents, and sharp typography to create an environment that feels both focused and powerful.

### 1.1 Color Palette

We avoid flat, primary colors. Instead, we use a tailored HSL palette with rich undertones.

*   **Backgrounds (The Void):**
    *   `bg-base`: `hsl(240, 10%, 4%)` — True deep obsidian, not flat black.
    *   `bg-surface`: `hsl(240, 10%, 8%)` — Slightly elevated cards.
    *   `bg-surface-elevated`: `hsl(240, 10%, 12%)` — Dropdowns and modals.
*   **Accents (The Neon):**
    *   `accent-primary`: `hsl(267, 100%, 65%)` — A vibrant, electric violet. Used sparingly for primary CTAs and active states.
    *   `accent-glow`: `hsl(267, 100%, 65%, 0.15)` — Used for diffuse shadows behind primary elements to create a neon glow effect.
    *   `accent-secondary`: `hsl(180, 100%, 50%)` — Cyan, used for secondary highlights, links, and code syntax accents.
*   **Text (High Contrast):**
    *   `text-primary`: `hsl(0, 0%, 98%)` — Crisp white.
    *   `text-secondary`: `hsl(240, 5%, 65%)` — Soft grey for body copy and metadata.
    *   `text-muted`: `hsl(240, 5%, 45%)` — Disabled states and subtle hints.

### 1.2 Typography

Typography is the backbone of the design. We pair a distinctive display font with a highly legible monospace font.

*   **Headings (Display):** **Space Grotesk** or **Clash Display**.
    *   *Usage:* Large, bold, tightly tracked. Gives the app a modern, architectural feel.
    *   *Styling:* `tracking-tight`, `font-bold`.
*   **Body (Sans-serif):** **Inter** or **Geist**.
    *   *Usage:* highly readable, neutral, gets out of the way of the content.
*   **Code & Metadata (Monospace):** **JetBrains Mono** or **Geist Mono**.
    *   *Usage:* Used not just for code blocks, but for badges, time estimates, and technical metadata to reinforce the developer-centric nature of the app.
    *   *Styling:* Smaller base size, slightly tracked out (`tracking-wide`), uppercase for tags.

---

## 2. Spacing, Borders & Glassmorphism

We avoid tight, cluttered interfaces. The design breathes through generous, deliberate whitespace.

### 2.1 Spacing & Padding

*   **Rhythm:** Based on an 8px grid (0.5rem).
*   **Macro Spacing:** Large margins between distinct page sections (e.g., `mb-24` or `mb-32`) to create a clear narrative flow down the page.
*   **Micro Spacing:** Generous internal padding within cards (`p-6` or `p-8`) so content doesn't feel cramped.

### 2.2 Borders & Radii

*   **Radii:** Soft but structured. We use `rounded-2xl` (16px) for major panels and cards, and `rounded-lg` (8px) for buttons and inputs. Avoid overly pill-shaped elements outside of small badges.
*   **Borders:** Instead of heavy solid borders, we use sub-pixel borders with low opacity to define edges without adding visual noise.
    *   `border-color`: `hsl(0, 0%, 100%, 0.08)`.

### 2.3 Glassmorphism (Subtle)

Glass effects are used strictly to establish hierarchy and depth, not just for decoration.
*   **Navigation / Floating Headers:** `backdrop-blur-md` with `bg-surface/60`.
*   **Hovered Cards:** When a repository or issue card is hovered, the background shifts to a slight glass effect to elevate it.

---

## 3. Microinteractions & Animation

Animations must feel tactile, physical, and highly responsive. We use physics-based spring animations rather than linear easings.

### 3.1 Button Dynamics (The "Magnetic" Feel)

Buttons shouldn't just change color; they should respond to the user's presence.

*   **Hover State:**
    *   The button slightly lifts (`translate-y-[-2px]`).
    *   A subtle, diffuse glow expands behind the button (`box-shadow: 0 0 20px rgba(accent-primary, 0.4)`).
    *   Text color brightens.
*   **Active/Click State:**
    *   The button physically depresses (`scale: 0.96`).
    *   The glow compresses.
    *   *Timing:* Instant on press, springy return on release.

### 3.2 Card Hover Effects

Cards (like Issue Cards or Skill Cards) are interactive surfaces.

*   **Rest:** Subtle 1px border (`white/5`).
*   **Hovering:**
    *   Border glows subtly with the primary accent (`border-accent-primary/30`).
    *   A soft background gradient shift occurs (e.g., a radial gradient centered on the mouse cursor follows the pointer—a "spotlight" effect).
    *   Any actionable icons inside the card (like an arrow or bookmark) slide slightly to the right (`translate-x-1`) or fade in.
*   **Transition:** `transition-all duration-300 ease-out`.

### 3.3 Page Transitions & Loading

*   **Entry Animation:** Elements should not just appear; they should cascade in. Use a staggered fade-up animation.
    *   `opacity: 0 -> 1`
    *   `transform: translateY(10px) -> translateY(0)`
    *   *Stagger:* 50ms delay between sibling elements.
*   **Skeleton Loaders:** Instead of generic gray pulsing blocks, use shimmering skeletons that mimic the shape of the content, tinted with a very dark violet/blue, featuring a fast, smooth shimmer sweep.

### 3.4 Micro-details

*   **Number Counters:** When the user's "Skill Score" or "Total PRs" load, the numbers should rapidly tick up from 0 to the final value, slowing down as they approach the target (ease-out easing).
*   **Progress Bars:** (e.g., Job status). The bar fills smoothly, and the leading edge has a bright, glowing tip.
*   **Checkboxes/Toggles:** Custom SVG animations for checking off steps in the implementation plan. A satisfying "draw" animation for the checkmark.

---

## 4. UI Component Anatomy

### 4.1 The "Issue Explainer" Panel

This is the core of the app. It must feel like reading an intelligence report.
*   **Layout:** Split pane or a wide, centered reading column (`max-w-3xl`).
*   **Typography:** The problem summary uses a slightly larger serif or high-contrast sans-serif to feel editorial.
*   **Code Pointers:** File paths (`cmd/info.go`) are styled as inline code blocks with cyan text and a dark cyan background (`bg-cyan-900/30 text-cyan-400`). Hovering over them underlines the path and reveals a subtle "Open in GitHub" tooltip.

### 4.2 The Implementation Plan (Numbered Steps)

*   **Visual Structure:** A vertical timeline or a sequence of connected cards.
*   **Step Numbers:** Large, bold, muted numbers (`text-muted`, `text-4xl`) sitting behind or to the left of the step content, providing structural anchor points.
*   **Interactive Checklist:** Clicking a step marks it done, fading the content to 50% opacity and crossing out the title with a smooth line-drawing animation.

### 4.3 The PR Draft Generation

*   **Presentation:** Presented in a simulated terminal or code editor window.
*   **Interaction:** A prominent "Copy to Clipboard" button that, when clicked, transforms into a bright green checkmark with a satisfying "pop" animation, while the container briefly pulses green.

---

## 5. Execution Rules (The "Anti-AI" Checklist)

To ensure the app looks bespoke and not like a generic generated template, strictly adhere to these rules:

1.  **NO default Tailwind blue/indigo.** Use the bespoke hex codes defined in the palette.
2.  **NO standard drop shadows.** Use layered, colored shadows (glows) instead of hard black shadows.
3.  **NO flat gray backgrounds.** Always inject a tiny amount of the primary hue into grays (e.g., use `zinc` or `slate` instead of `gray`, or custom HSL).
4.  **YES to bespoke cursors/interactions.** Implement the spotlight hover effect on cards.
5.  **YES to typographic hierarchy.** Don't just make text bigger; change weight, tracking, and family (e.g., Mono for meta, Display for headers).
6.  **YES to empty state art.** Empty states (no issues found) should feature subtle, abstract geometric illustrations or ASCII art, not generic stock SVG illustrations.
