# Fieldry MVP — Persona UX Review

Review date: May 2026  
Scope: Fieldry local WOS capture (`apps/fieldry/`)

---

## Field biologist

**Can record comfortably?** Yes — date, time, coordinates, habitat, confidence, and WOS metadata are present. Export JSON preserves full schema.

**Still missing:** Quantity/count fields, measurements array, evidence quality rating, Darwin Core export button, taxon ID lookup.

**V2:** Measurement templates, verification workflow, batch export, sensitive-species flags with auto location fuzzing.

---

## Naturalist

**Can record comfortably?** Yes — under-two-minute field note path (title, type, date, confidence, notes). Season and phenology in advanced section.

**Still missing:** Photo attachment, sketch slot, phenology picklist from regional OIP.

**V2:** Local photo storage, link observations to Seasonal Watch species, phenology presets.

---

## Teacher

**Can record comfortably?** Yes — educational tips on form, ethics sidebar, honest confidence labels.

**Still missing:** Printable field lab worksheet, class-agnostic export without device IDs in CSV.

**V2:** Classroom export mode, guided investigation templates tied to Weekend Investigation.

---

## Beginning birder

**Can record comfortably?** Yes — species optional, confidence encourages uncertainty, wildlife observation type clear.

**Still missing:** Bird-specific hints, checklist integration, audio note for song (future).

**V2:** Optional eBird-style fields without implying integration; audio memo capture.

---

## Mycologist

**Can record comfortably?** Yes — fungi type, habitat emphasis, ethical notes for no-collection.

**Still missing:** Substrate field in main form (in WOS habitat.substrate but not in UI), photo evidence.

**V2:** Substrate/substrate code picker, spore print note, ForageCast cross-link for ID learning only.

---

## Wildlife photographer

**Can record comfortably?** Yes — ethical notes, private-by-default, location privacy tier in metadata.

**Still missing:** Photo attach, EXIF preservation, location obfuscation UI.

**V2:** Local image attach with auto strip EXIF option, photography ethics callout on media panel.

---

## Cross-cutting

**Strengths:** Calm notebook aesthetic, no gamification, WOS-aligned storage, JSON/CSV export, OIP weather/season hydration on save.

**Gaps:** Photos, elevation, public sharing, cloud sync (correctly deferred).

**Recommended V2 milestone:** Local photo evidence + location privacy picker + Darwin Core single-record export.
