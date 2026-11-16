---
name: recipe
description: Draw how code works as a Recipe board, a whiteboard-style flow (dotted canvas, grey step cards, orange decision gates, a green "Saved" lane, red dashed gaps, pills showing code vs AI) built as hand-written inline SVG in a self-contained HTML page and published as a claude.ai artifact, so a non-technical reader can review a build. Use when asked for a Recipe, a board, a logic map, a flow diagram of how code works, a paper trail of what a build does, a whiteboard- or FigJam-style diagram, or to diagram code flow for review. Not the Figma tool: never call Figma's generate_diagram for this.
---

# Recipe board

A Recipe board shows how a piece of code makes its decisions, in the order they happen, for someone who will not read the code.

## Page
Start from `assets/page-template.html` in this skill's folder (full CSS tokens, light and dark). Fill the placeholders. One `<figure>` per board; the caption says what it claims and its source (branch/commit/date, or "from the chat" when no code was traced).

Publish:
- **Claude Code:** the artifacts publish-from-files tool (title, icon "map"); republish to the same slug as the boards change.
- **Claude chat (desktop/web):** if the claude-artifacts connector is on, use `publish_version` with the full filled page (icon "map"). Otherwise create an HTML artifact with the full filled page and update that same artifact as the boards change. With no code to trace in chat, draw from what the person describes or pastes, and say so in the caption.

## SVG rules
- One inline `<svg viewBox="0 0 900 H">`, `role="img"`, `aria-label` stating the flow. No `<style>`, `<script>` or `<foreignObject>` inside; only the page's classes.
- Unique ids per svg (suffix, e.g. `-ws5`): `<pattern id="dots-X" width="22" height="22" patternUnits="userSpaceOnUse"><circle class="dot" cx="2" cy="2" r="1.2"/></pattern>`, markers `ah-X` (path class `ah`), `ahg-X` (class `ah-g`), `aho-X` (class `ah-o`): `viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"`, path `M0,0 L10,5 L0,10 z`.
- Background: `<rect class="canvas">` full size, then a rect filled `url(#dots-X)`.
- Step: `rect.bx rx=14`, title `text.t` + subtitle lines `text.s`, left-aligned (see Main board below).
- Decision or flag gate: `rect.or`, `text.t-o` / `text.s-o`. Label every branch (yes / no / flag off / error / empty).
- Saved data: left `rect.lane rx=16` titled "Saved" (`t-g`/`s-g`), items `text.ln` (mono name) + `text.ls`; connect with dashed green `path.ar-g` to `ahg-X`. Each green line lands on its item's row (no label needed), and runs in the gap between the lane and the steps, one x per line so they never share a track; regions start right of those lines.
- Region: `rect.reg` with `stroke-dasharray="6 5"`, title `text.rt` top-right, `text-anchor="end"`.
- Arrows: `path.ar` marker `ah-X`; labels `text.al` (≤4 words).
- Gap or bug: dashed red `rect.scrap` around the box + `text.tag-r` ("GAP: …", "CHECK: …").
- Planned / not built: `rect.pp` with `t-p`/`s-p` and a `tag-p` "PLANNED".
- End of a flow: `rect.term rx=30` (rounded ends), centred `text.t` (plus one centred `text.s` line if needed), naming what happens next ("Step 5 reads the label", "New contact"). Orange branch lines `.ar-o`; planned branch lines `.ar-p` + `.al-p`.
- Pills: every step card gets one pill per thing that does the work, so the reader sees at a glance what is plain code and what is AI. `code` (`p-code`) for plain code. An AI model gets its name exactly as the code calls it, one colour per distinct model on the board, in order of first appearance: `p-ai-a`, then `p-ai-b`, then `p-ai-c`. Anything else (an outside service, a person's tool) uses `p-code` with its name. Shape: `<rect class="p-X" height="20" rx="10">` sitting on the card's top edge (y = card y − 10), right edge 12 px inside the card's right edge, width ≈ 7 px per character + 16; `<text class="pt p-X-t" text-anchor="middle">` centred, baseline y = rect y + 14. Several pills sit side by side leftwards with 6 px gaps.

## Main board and sub-diagrams
Every level is a flow (top to bottom, numbered, with arrows), never a mind map, ring or grid.
- **Main board:** the whole path in the order it happens. Steps are numbered in the title, `N · Title`, left-aligned at card x + 16, with up to 3 short `text.s` lines under it (17 px apart). Keep it to the main path; detail goes into sub-diagrams.
- **When to split:** a step that hides its own decisions (more than about 2 gates, an AI ladder, a matching rule) gets a sub-diagram. On the main board, put a small side card to its right, titled "<Step>, up close", subtitle "drawn below the map", joined by an arrow labelled "details".
- **Sub-diagram:** its own `<h2>Step N up close: <what it decides></h2>` and `<figure>` below the main board, a full flow under the same rules (own svg, own id suffix, its own Saved lane and pills). It starts where step N starts and ends in `term` boxes that hand back to the main flow ("Step 5 reads the label"). It can have its own sub-diagrams, drawn further down, same pattern.
- **Worth knowing:** logic the flow uses but does not run (how a score or rhythm is worked out) goes under `<h2>Worth knowing</h2>` as `<h3 class="fig-title">How X is worked out</h3>` + its own flow figure.
- **Captions:** each sub-diagram caption gives one worked example with a named person ("Maya was in touch with Sam on 9 days…").
- **Findings** last, under "Found while tracing".

## Content rules
- Draw what the code does, traced from source with file evidence, not what someone claims. Say in the caption when it is unverified.
- Grid-align (multiples of 6), even gaps, no overlapping boxes or labels, short labels (≤5 words), sentences go in the caption or the findings list below the figure.
- Plain language for whoever reads it; assume a non-technical founder. No jargon in box titles; code names only in the Saved lane or findings.
