---
name: vibasic-design
description: Use this skill to generate well-branded interfaces and assets for Vibasic (inventory management with ROP/EOQ decision support), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read README.md first (implementation handoff: tokens, components, rules), then DESIGN_GUIDE.md (content tone, visual foundations, iconography). Explore the other files as needed.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, copy `tokens/`, `fonts/`, `assets/` and port the components in `components/` into the target stack, following the rules here.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
