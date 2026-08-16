RENO SPEC SHEET — BACKEND CONTEXT

Purpose: living state file for the Daniko Unit Renovation Spec Sheet project. Update this file at the end of any session that changes status — don't rely on chat recaps. Any new chat should read this file first before touching the spec sheet.

Last updated: 2026-08-16

CONFIRMED / DONE

- Unit Renovation Spec Sheet v7 (HTML + PDF) is now the current version — 10 pages, 8.5x11, page-break CSS holding
- v7 = v6 + these changes: Kitchen Sink switched to Stylish S-411T single bowl (was double bowl); Bathroom Fan switched to Cyclone HushTone ESLPD3S100H (was Air King AS50); new "Wall Waterproofing (Tub/Shower)" line item added to Bathroom table specifying Schluter KERDI-BOARD across the full wet-wall assembly (tub surround backing, tile substrate, base/bottom plate); new "Wall Removal (If Applicable)" free-text row added to Contractor Notes & Scope Clarifications table; new Schedule A appendix section added (Window Waterproofing Standard — frame build-out, pitched bottom plate, sealed screw holes, fully bonded edges, pass/fail at progress-payment walkthrough)
- v6 baseline (still applies): hybrid C2K/Silva spec, Qty column across all tables, Approved Equivalent column, Daniko Supplies section, Windows & Exterior Doors section, Bedroom 1/2 sections, Blinds section, Pantry Conversion (front entry closet), payment schedule (20/60/20), 2-year warranty clause, electrical permit fine print (cost included in quote), demo/haul-away note, kitchen/bath GFI, hydro panel→breaker-style, island overhang, fridge dedicated circuit, front door hinge check, crown molding gap note, MOEN Adler kitchen faucet, MOEN Findlay bath faucet, MOEN Adler shower set (brass valve confirm + caulk note), Zinsser Perma-White bathroom paint, Alex Direct interior door slab, bedroom ceiling fan folded into main Lighting list, Dimmer Switch + GFI added to Switches
- Unit Assessment Form (mobile fillable HTML, PDF download) — shelved per Roberto, not in current use
- Cleaning Expectations Checklist (HTML + PDF) — done, includes "inspect closely" tags, wall/cobweb checks, Management Attention flag section

JUDGMENT CALLS MADE BUILDING V7 (flag for Roberto to sanity-check)

- KERDI-BOARD: no existing "Base" row existed in v6 (only Bathtub + Tub Surround Tile). Added ONE new standalone line item "Wall Waterproofing (Tub/Shower)" covering tub/tile/base as a single spec, rather than editing 3 separate rows — cross-referenced to Schedule A
- Kitchen sink (Stylish S-411T) and bathroom fan (Cyclone HushTone ESLPD3S100H) specs use only confirmed model names/numbers — exact gauge/CFM/sone figures were NOT fabricated and are flagged "to confirm on cut sheet" in the fan row. Send the actual product spec sheets if you want exact numbers filled in
- Wall Removal note placed inside the Contractor Notes & Scope Clarifications table (matches the free-text pattern used for Site Conditions / Contractor Notes), not as its own full section
- Displayed "Version 2.0" label on the cover/footer was left unchanged — only the external file name bumped to v7. Say the word if you want that bumped to Version 3.0

BROKEN / INCOMPLETE

- v7 HTML/PDF delivered to Roberto for download — NOT yet uploaded to Drive (see quirk below). Roberto needs to drag both files into the Contractor Renos Drive folder manually, or ask Claude to attempt the direct upload
- Google Drive direct upload of large files (900K+ HTML/PDF) has previously truncated silently via the create_file connector — small text files (like this context.md) upload fine directly. Treat large HTML/PDF uploads as unverified until tested again

KEY IDS / URLS

- Daniko Drive folder: https://drive.google.com/drive/folders/18rDhTXiRwlXC8_yB1EliuT_5HXeQj53v
- Contractor Renos subfolder (where spec sheet files + this context file live): https://drive.google.com/drive/folders/190eN6NQk2mAg9BdYCGvHN3W5jKSRIOxs
- Latest files: daniko_spec_sheet_v7.html / daniko_spec_sheet_v7.pdf (delivered via chat, not yet in Drive) — v6.html / v6.pdf remain in Drive as the prior version
- Product refs in use: MOEN Adler kitchen faucet (87233SRS), MOEN Findlay bath faucet (84516), MOEN Adler shower set (L82839), Zinsser Perma-White (Z02712), Alex Direct door slab (HW26681PFBSHF8), Home Decorators blind (25FWT2448W), Zenna Home shower rod (99336), Stylish single-bowl sink (S-411T), Cyclone HushTone exhaust fan (ESLPD3S100H), Schluter KERDI-BOARD (wall waterproofing system, no model/SKU on file)

NEXT STEP

- Roberto to review v7 and confirm the judgment calls above (KERDI row placement, Wall Removal location, Version label)
- Get Roberto to drag v7.html/v7.pdf into the Contractor Renos Drive folder (or ask Claude to attempt direct upload again)
- If exact cut-sheet specs for the sink and fan are available, send them to tighten up those two rows

MISTAKES & FIXES

- Google Fonts @import in HTML broke wkhtmltopdf rendering — stripped it, switched to system fonts
- Page-break CSS was missing entirely from the spec sheet (existed on the cleaning checklist but never carried over) — root cause of the Hydro Panel row splitting across pages. Fixed by adding break-inside: avoid rules to .spec-table tr, .notes-row, .supplies-section, .section-header globally
- Duplicate embedded image (Primer can appeared twice) when inserting the new Bathroom Paint row — fixed by giving that row a placeholder icon instead
- Google Drive search_files does not reliably surface a just-uploaded HTML file right away by title search alone — had to query by parentId + createdTime to confirm it landed before downloading

PLATFORM QUIRKS

- wkhtmltopdf doesn't support @media print reliably — page-break rules must live in the main CSS block, not a print-only block, or they get ignored
- Google Drive create_file base64Content silently truncates large payloads with no error — always verify returned fileSize matches actual bytes before trusting an upload
- Google Drive download_file_content on a ~900K HTML file returns content too large for direct tool output — must download to a file, then base64-decode via a script rather than reading inline
- HEIC photos need pillow-heif (pip install with --break-system-packages) to view — not natively viewable

PARKED

- Unit Assessment Form (fillable, mobile) — shelved, may revisit later
- Contractor itemized quote from Gurjot — Roberto handling that conversation directly, not tracked here further
