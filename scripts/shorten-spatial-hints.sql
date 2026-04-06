-- ============================================================
-- Shorten spatial hints for Flux 2 prompt attention budget
-- Generated 2026-04-06
--
-- Principle: Flux sees the base photo and already knows the layout.
-- Hints only need to disambiguate WHICH surface to change.
-- Target: 5-15 words per hint. Visual disambiguation > prose description.
-- Cabinet hints keep zone enumeration (upper/lower/flanking) — critical.
-- Unique structural features (waterfall, peninsula) are preserved.
-- Orientation-critical hints (faucet, sink) are trimmed but kept.
-- ============================================================


-- ============================================================
-- DEMO ORG (0d255878-9268-468a-b9e2-95b7552b6126)
-- ============================================================


-- ------------------------------------------------------------
-- The Nest / design-your-kitchen (id: 963ea4a0)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "range": "range along the back wall. Slide-in: no raised back panel, flush with countertop. Freestanding: raised control panel.",
  "backsplash": "backsplash wall strip in the cooking zone",
  "counter-top": "all countertop surfaces — perimeter and center workspace",
  "kitchen-sink": "undermount sink in the island countertop — preserve exact position and orientation",
  "refrigerator": "refrigerator alcove on the left side of the back wall",
  "kitchen-faucet": "faucet on the island countertop — spout arches away from camera toward the back wall",
  "common-wall-paint": "all wall surfaces",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "main-area-flooring-color": "all visible flooring",
  "cabinet-style-whole-house": "all cabinet doors and drawer fronts",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — freestanding island in foreground"
}'::jsonb
WHERE id = '963ea4a0-3ae7-4e3e-8738-b372f2d4a05c';


-- ------------------------------------------------------------
-- The Nest / set-your-style (id: a725a9fd)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "lighting": "light fixtures — chandelier, pendants, recessed",
  "baseboard": "baseboard molding along the floor line",
  "crown-options": "crown molding where walls meet ceiling",
  "great-room-fan": "ceiling fan above living area",
  "kitchen-faucet": "faucet on the island countertop — spout arches away from camera toward the back wall",
  "fireplace-mantel": "fireplace mantel on the far left wall",
  "common-wall-paint": "all wall surfaces",
  "interior-door-style": "interior doors",
  "kitchen-cabinet-color": "upper wall cabinets and lower base cabinets along kitchen walls — every wall-attached cabinet door and drawer front",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "main-area-flooring-color": "all visible hard-surface flooring",
  "cabinet-style-whole-house": "all cabinet doors and drawer fronts",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — large island in right foreground"
}'::jsonb
WHERE id = 'a725a9fd-6b03-4cd5-a6ce-cf7a7f4a68c1';


-- ------------------------------------------------------------
-- The Nest / primary-bath (id: ea66cf4e)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "bath-faucets": "faucets on the vanity",
  "bath-hardware": "towel rings, toilet paper holders, and bath accessories on walls",
  "primary-shower": "mosaic tile on the shower floor only",
  "floor-tile-color": "large format tile on the bathroom floor",
  "primary-bath-mirrors": "mirrors above the vanity",
  "bathroom-cabinet-hardware": "vanity cabinet hardware — pulls and knobs",
  "primary-bath-cabinet-color": "vanity cabinet color"
}'::jsonb
WHERE id = 'ea66cf4e-4de3-4c4f-a627-a8bdc8200f09';


-- ------------------------------------------------------------
-- The Nest / secondary-spaces (id: 055ce8ce)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "baseboard": "baseboard molding along the floor line",
  "bedroom-fan": "ceiling fan in the bedroom",
  "carpet-color": "carpet covering the entire bedroom floor",
  "common-wall-paint": "all wall surfaces",
  "main-area-flooring-color": "hard-surface flooring in non-carpet areas"
}'::jsonb
WHERE id = '055ce8ce-5471-4a2c-9f98-e4d9916ed2e1';


-- ------------------------------------------------------------
-- Westbay / kitchen (id: 2d45ea6f)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone, flanking the chimney range hood",
  "counter-top": "all countertop surfaces — perimeter and center workspace",
  "common-wall-paint": "wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring",
  "kitchen-island-cabinet-color": "island base cabinet doors and panel faces — large rectangular center island in foreground"
}'::jsonb
WHERE id = '2d45ea6f-7e22-4b73-bb62-ccc366df95f7';


-- ------------------------------------------------------------
-- Rocklyn / kitchen (id: d057186a) — no island
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone",
  "counter-top": "all countertop surfaces — perimeter only",
  "common-wall-paint": "all visible wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring"
}'::jsonb
WHERE id = 'd057186a-6504-4a95-b181-4d27f2bf3a39';


-- ------------------------------------------------------------
-- Stylecraft / kitchen (id: ab7a4537) — peninsula island
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone",
  "counter-top": "all countertop surfaces — perimeter and peninsula workspace",
  "common-wall-paint": "wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring",
  "kitchen-island-cabinet-color": "peninsula base cabinet doors and drawer fronts — foreground left, attached to perimeter"
}'::jsonb
WHERE id = 'ab7a4537-1d22-418a-adf5-0430bd236533';


-- ------------------------------------------------------------
-- Davidson / kitchen (id: b5a484af) — center island, waterfall countertop on both short ends
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone",
  "counter-top": "all countertop surfaces — perimeter and center workspace. Center island has a waterfall edge — slab extends down both short ends to the floor.",
  "common-wall-paint": "wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking the range hood and refrigerator — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — large center island in foreground"
}'::jsonb
WHERE id = 'b5a484af-d684-4ae5-bfb5-56478839af90';


-- ------------------------------------------------------------
-- Kolter / kitchen (id: e7da5828) — no island, waterfall countertop on both short ends
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone, flanking the chimney range hood",
  "counter-top": "all perimeter countertop surfaces. The center workspace has a waterfall edge — slab extends down both short ends to the floor.",
  "common-wall-paint": "wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring"
}'::jsonb
WHERE id = 'e7da5828-c338-49bf-a9a8-a46d04f75558';


-- ------------------------------------------------------------
-- Viera / kitchen (id: 69ccb6b3) — U-shaped, no island
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone, flanking the chimney range hood",
  "counter-top": "all countertop surfaces — U-shaped perimeter, continuous surface",
  "common-wall-paint": "wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front across the U-shape",
  "main-area-flooring-color": "all visible flooring"
}'::jsonb
WHERE id = '69ccb6b3-354d-42ab-877b-dfabe52b70fa';


-- ------------------------------------------------------------
-- Signature / kitchen (id: 0c3fac51) — center island
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone",
  "counter-top": "all countertop surfaces — perimeter and center workspace",
  "common-wall-paint": "wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — center island with bar stools in foreground"
}'::jsonb
WHERE id = '0c3fac51-f258-4609-9354-fe22b9819c6b';


-- ------------------------------------------------------------
-- ICI / kitchen (id: b119cac1) — center island, tall pantry cabinets right side
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone",
  "counter-top": "all countertop surfaces — perimeter and center workspace",
  "common-wall-paint": "wall surfaces above the tall right-side cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and tall pantry-height cabinets on the right side — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — center island with bar stools in foreground"
}'::jsonb
WHERE id = 'b119cac1-60b6-4cf9-9c02-0428ab165481';


-- ------------------------------------------------------------
-- McKinley / kitchen (id: 609776ba) — island with farmhouse apron sink, cabinets on right wall
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone on the right wall",
  "counter-top": "all countertop surfaces — right wall perimeter and center island",
  "common-wall-paint": "wall surfaces above the cabinetry runs",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances along the right wall — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — center island with farmhouse apron sink running left-to-right"
}'::jsonb
WHERE id = '609776ba-5d0a-4476-8624-c25c65b4c575';


-- ------------------------------------------------------------
-- Neal / kitchen (id: 76a6535b) — island with cooktop
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone",
  "counter-top": "all countertop surfaces — perimeter and full length of center workspace",
  "common-wall-paint": "wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — long island in foreground with cooktop"
}'::jsonb
WHERE id = '76a6535b-2eff-4bf0-89cd-462fef3657d2';


-- ------------------------------------------------------------
-- Christopher Alan / kitchen (id: 9062efeb) — island, no backsplash key
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "counter-top": "all countertop surfaces — perimeter and center workspace",
  "common-wall-paint": "all visible wall surfaces above the cabinetry",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front",
  "main-area-flooring-color": "all visible flooring",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — rectangular center island with bar stools in foreground"
}'::jsonb
WHERE id = '9062efeb-b08b-46be-8622-b3ff60095a4c';


-- ------------------------------------------------------------
-- Chesapeake / kitchen (id: 5faa5d9c) — L-shaped, no island
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "backsplash": "backsplash wall strip in the cooking zone",
  "counter-top": "all countertop surfaces — perimeter only, L-shaped layout",
  "common-wall-paint": "wall surfaces above the upper cabinets",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front, L-shaped layout",
  "main-area-flooring-color": "all visible flooring"
}'::jsonb
WHERE id = '5faa5d9c-b030-4b0d-98c4-efb3fb7aad27';


-- ============================================================
-- SM ORG (364538bf-1712-48e7-a905-04ad90983eb2)
-- ============================================================


-- ------------------------------------------------------------
-- The Kinkade / design-your-kitchen (id: d3b60a74)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "range": "range along the back wall. Slide-in: no raised back panel, flush with countertop. Freestanding: raised control panel.",
  "lighting": "chandelier and pendant lights",
  "baseboard": "baseboard molding along the floor line",
  "backsplash": "backsplash wall strip in the cooking zone",
  "dishwasher": "dishwasher panel — left side of island or near sink",
  "trim-paint": "trim and molding along walls",
  "counter-top": "all countertop surfaces — perimeter and center workspace",
  "kitchen-sink": "undermount sink in the island countertop — preserve exact position and orientation",
  "refrigerator": "refrigerator alcove on the left side of the back wall",
  "ceiling-paint": "ceiling",
  "kitchen-faucet": "faucet on the island countertop — spout arches away from camera toward the back wall",
  "countertop-edge": "edge profile on all countertops",
  "common-wall-paint": "all wall surfaces",
  "door-casing-color": "door frames and casings",
  "interior-door-style": "interior doors",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every wall-attached cabinet door and drawer front",
  "under-cabinet-lighting": "LED strips underneath upper cabinets",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "main-area-flooring-color": "all visible flooring",
  "cabinet-style-whole-house": "all cabinet doors and drawer fronts",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — large freestanding island in foreground center"
}'::jsonb
WHERE id = 'd3b60a74-1ee6-4dd1-a313-99d636f5a7b2';


-- ------------------------------------------------------------
-- The Kinkade / set-your-style (id: 50d25549)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "lighting": "light fixtures — apply to each visible fixture in position",
  "baseboard": "baseboard molding along the floor line",
  "backsplash": "backsplash wall strip in the cooking zone",
  "trim-paint": "trim and molding along walls",
  "bedroom-fan": "ceiling fan in the bedroom",
  "counter-top": "all countertop surfaces — perimeter and center workspace",
  "wainscoting": "wainscoting panels on lower walls",
  "carpet-color": "carpet covering the entire bedroom floor",
  "kitchen-sink": "undermount sink in the island countertop — preserve exact position and orientation",
  "ceiling-paint": "ceiling",
  "crown-options": "crown molding where walls meet ceiling",
  "great-room-fan": "ceiling fan in the great room",
  "kitchen-faucet": "faucet on the island countertop — spout arches away from camera toward the back wall",
  "fireplace-hearth": "fireplace hearth platform at floor level",
  "fireplace-mantel": "painted mantel surround and shelf framing the firebox",
  "common-wall-paint": "all wall surfaces",
  "door-casing-color": "door frames and casings",
  "interior-door-style": "interior doors",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every wall-attached cabinet door and drawer front",
  "fireplace-mantel-accent": "decorative accent wall area directly above the mantel shelf",
  "fireplace-tile-surround": "tile or stone surface framing the firebox opening",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "main-area-flooring-color": "all visible hard-surface flooring",
  "cabinet-style-whole-house": "all cabinet doors and drawer fronts",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — freestanding island in kitchen"
}'::jsonb
WHERE id = '50d25549-eba5-424d-8d40-9fe70ff45b1d';


-- ------------------------------------------------------------
-- The Kinkade / secondary-spaces (id: 89daca6a)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "baseboard": "baseboard molding along the floor line",
  "trim-paint": "trim and molding along walls",
  "bedroom-fan": "ceiling fan in the bedroom",
  "carpet-color": "carpet covering the entire bedroom floor",
  "ceiling-paint": "ceiling",
  "crown-options": "crown molding where walls meet ceiling",
  "door-hardware": "door knobs and levers on interior doors",
  "secondary-shower": "shower tile",
  "common-wall-paint": "all wall surfaces",
  "door-casing-color": "door frames and casings",
  "secondary-bath-mirrors": "mirror above vanity",
  "primary-closet-shelving": "closet shelving system",
  "secondary-bath-cabinet-color": "vanity cabinet color"
}'::jsonb
WHERE id = '89daca6a-9a01-4fa5-ae5b-be65ec1ff3ce';


-- ------------------------------------------------------------
-- The Kinkade / primary-bath (id: c9346ee2)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "baseboard": "baseboard molding along the floor line",
  "rain-head": "overhead rain shower head inside the shower enclosure",
  "trim-paint": "trim and molding along walls",
  "accent-color": "accent paint on the vanity wall behind mirrors",
  "bath-faucets": "faucets on the vanity",
  "carpet-color": "carpet flooring in the bedroom (visible through doorway)",
  "bath-hardware": "towel rings, toilet paper holders, and bath accessories on walls",
  "ceiling-paint": "ceiling",
  "door-hardware": "door knobs and levers on interior doors",
  "primary-shower": "mosaic tile on the shower floor — small square or penny tiles inside the shower enclosure",
  "floor-tile-color": "large format tile on the bathroom floor and shower walls",
  "common-wall-paint": "all wall surfaces",
  "door-casing-color": "door frames and casings",
  "primary-bath-vanity": "vanity cabinet below the mirrors",
  "primary-bath-mirrors": "mirrors above the vanity",
  "primary-shower-entry": "shower entry glass panel",
  "wall-mount-hand-shower": "hand shower wand with flexible hose inside the shower enclosure",
  "main-area-flooring-type": "LVP/hardwood flooring type in non-bathroom areas — closet and bedroom zones",
  "primary-closet-shelving": "wire shelving in the walk-in closet — rails and hanging rods on closet walls",
  "main-area-flooring-color": "LVP/hardwood flooring color in non-bathroom areas — closet and bedroom zones",
  "bathroom-cabinet-hardware": "vanity cabinet hardware — pulls and knobs",
  "cabinet-style-whole-house": "all cabinet doors and drawer fronts",
  "primary-bath-cabinet-color": "vanity cabinet color"
}'::jsonb
WHERE id = 'c9346ee2-1486-45ec-8f26-c252ffd167cd';


-- ------------------------------------------------------------
-- Lenox / design-your-kitchen (id: 291653d1)
-- NOTE: dishwasher on RIGHT END of island — kept explicit, it's unusual
-- NOTE: refrigerator alcove on left side — kept for placement accuracy
-- NOTE: faucet and sink orientation — kept, critical for model
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "range": "range along the back wall. Slide-in: no raised back panel, flush with countertop. Freestanding: raised control panel.",
  "lighting": "pendant lights and recessed ceiling lights",
  "backsplash": "backsplash wall strip in the cooking zone",
  "dishwasher": "stainless dishwasher panel on the right end of the island — narrow end facing the perimeter cabinets",
  "light-rail": "light rail molding beneath upper cabinets",
  "counter-top": "all countertop surfaces — perimeter and center workspace",
  "kitchen-sink": "undermount sink in the island countertop — preserve exact position and orientation",
  "refrigerator": "open alcove on the left side of the back wall — when selected, place refrigerator here; when empty, keep as open wall recess",
  "kitchen-faucet": "faucet on the island countertop — spout arches away from camera toward the back wall",
  "countertop-edge": "edge profile on all countertops",
  "common-wall-paint": "wall surfaces above the tile zone and beside the cabinetry",
  "trash-can-cabinet": "pull-out trash can cabinet",
  "glass-cabinet-door": "glass-front doors on select upper cabinets",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every wall-attached cabinet door and drawer front",
  "under-cabinet-lighting": "LED strips underneath upper cabinets",
  "main-area-flooring-type": "LVP/hardwood plank flooring type",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "main-area-flooring-color": "all visible flooring",
  "cabinet-style-whole-house": "all cabinet doors and drawer fronts",
  "kitchen-island-cabinet-color": "island base cabinet doors and drawer fronts — large freestanding island in center"
}'::jsonb
WHERE id = '291653d1-c306-4795-83df-db0ee221dc58';


-- ------------------------------------------------------------
-- Lenox / primary-bath (id: 80ee5411)
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "baseboard": "baseboard molding along the floor line",
  "rain-head": "rain shower head in the shower ceiling",
  "trim-paint": "trim and molding along walls",
  "bedroom-fan": "ceiling fan in the bedroom",
  "accent-color": "accent wall color",
  "bath-faucets": "faucets on the vanity",
  "carpet-color": "carpet covering the entire bedroom floor",
  "bath-hardware": "towel rings, towel bars, and bath accessories on walls",
  "ceiling-paint": "ceiling",
  "crown-options": "crown molding where walls meet ceiling",
  "primary-shower": "mosaic tile on the shower floor — small square or penny tiles inside the shower enclosure",
  "floor-tile-color": "large format tile on the bathroom floor and shower walls",
  "common-wall-paint": "all wall surfaces",
  "door-casing-color": "door frames and casings",
  "interior-door-style": "interior doors",
  "primary-bath-vanity": "vanity cabinet below the mirror",
  "primary-bath-mirrors": "framed mirror above the vanity",
  "primary-shower-entry": "shower entry glass panel",
  "wall-mount-hand-shower": "hand shower on the shower wall",
  "main-area-flooring-type": "LVP/hardwood flooring type in non-bathroom areas",
  "primary-closet-shelving": "closet shelving in the primary walk-in closet",
  "main-area-flooring-color": "LVP/hardwood flooring in non-bathroom areas",
  "bathroom-cabinet-hardware": "vanity cabinet hardware — pulls and knobs",
  "cabinet-style-whole-house": "all cabinet doors and drawer fronts",
  "primary-bath-cabinet-color": "vanity cabinet color"
}'::jsonb
WHERE id = '80ee5411-adf0-4979-af26-24bdced2cd7b';


-- ------------------------------------------------------------
-- Lenox / secondary-spaces (id: 6d954e86)
-- NOTE: tub/shower is a one-piece molded unit (not tile) — kept, prevents wrong render
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "baseboard": "baseboard molding along the floor line",
  "trim-paint": "trim and molding along walls",
  "bedroom-fan": "ceiling fan in the bedroom",
  "bath-faucets": "faucets on the vanity",
  "carpet-color": "carpet covering the entire bedroom floor",
  "bath-hardware": "bathroom accessories — towel bars, towel rings, robe hooks",
  "ceiling-paint": "ceiling",
  "crown-options": "crown molding where walls meet ceiling",
  "door-hardware": "door knobs and levers on interior doors",
  "floor-tile-color": "large format tile on the bathroom floor",
  "secondary-shower": "tub/shower surround — one-piece molded unit, smooth walls",
  "common-wall-paint": "all wall surfaces",
  "door-casing-color": "door frames and casings",
  "interior-door-style": "interior doors",
  "secondary-bath-mirrors": "mirror above vanity",
  "secondary-bath-walk-in": "walk-in shower replacing tub/shower combo",
  "main-area-flooring-type": "LVP/hardwood flooring type in non-bathroom areas",
  "main-area-flooring-color": "LVP/hardwood flooring in non-bathroom areas",
  "secondary-bath-steel-tub": "steel tub in secondary bath",
  "bathroom-cabinet-hardware": "vanity cabinet hardware — pulls and knobs",
  "secondary-bath-cabinet-color": "vanity cabinet color"
}'::jsonb
WHERE id = '6d954e86-e488-4702-9789-aa85bd48db26';


-- ------------------------------------------------------------
-- Lenox / set-your-style (id: e4366348)
-- NOTE: wainscoting on lower-left of back wall (LEFT OF FIREPLACE) — critical spatial
-- NOTE: front-door at end of foyer hallway — kept for placement
-- ------------------------------------------------------------
UPDATE steps SET spatial_hints = '{
  "lighting": "light fixtures — apply to each visible fixture in position",
  "baseboard": "baseboard molding along the floor line",
  "front-door": "front entry door at the end of the foyer hallway",
  "trim-paint": "trim and molding along walls",
  "bedroom-fan": "ceiling fan in the bedroom",
  "wainscoting": "wainscoting panels on lower-left portion of the back wall, left of the fireplace",
  "accent-color": "accent wall color",
  "carpet-color": "carpet covering the entire bedroom floor",
  "ceiling-paint": "ceiling",
  "crown-options": "crown molding where walls meet ceiling",
  "great-room-fan": "ceiling fan in the great room",
  "fireplace-hearth": "fireplace hearth at floor level on the back wall",
  "fireplace-mantel": "fireplace mantel surround on the right portion of the back wall",
  "common-wall-paint": "all wall surfaces",
  "door-casing-color": "door frames and casings",
  "interior-door-style": "interior doors",
  "fireplace-mantel-accent": "decorative accent area above the mantel shelf on the back wall",
  "fireplace-tile-surround": "tile surround framing the firebox opening",
  "main-area-flooring-type": "LVP/hardwood flooring type in non-bathroom areas",
  "main-area-flooring-color": "LVP/hardwood flooring in non-bathroom areas",
  "cabinet-style-whole-house": "all cabinet doors and drawer fronts"
}'::jsonb
WHERE id = 'e4366348-a4e4-4b42-8592-e513f61416ce';
