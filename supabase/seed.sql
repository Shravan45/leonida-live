-- Seed content grounded in official GTA6 trailers/reveals and public
-- coverage (see IMPLEMENTATION_PLAN.md session log for sources). Pins have
-- created_by = null (no associated auth user), so author_name is set
-- directly here rather than via the pins-insert trigger.
insert into public.pins (lat, lng, title, description, category, author_name, upvote_count, created_at)
values
  (25.7850, -80.1936, 'NINE 1 NINE nightclub spotted',
   'Trailer 2 has Jason and Lucia heading into "NINE 1 NINE" — it''s clearly modeled on E11EVEN, the real 24-hour Downtown Miami megaclub. Same block, same neon-drenched energy.',
   'easter_egg', 'VicePatrol88', 34, now() - interval '2 days'),

  (25.8010, -80.1994, 'Tommy Vercetti iguana mural',
   'Blink and you''ll miss it — background graffiti of an iguana wearing Tommy''s blue-and-black shirt pattern from the original Vice City. Wynwood''s mural scene clearly inspired this corner of the map.',
   'easter_egg', 'GraffitiGuru33', 41, now() - interval '36 hours'),

  (25.7617, -80.1918, 'Cash notes feature RDR2 legends',
   'Close-up shots of stacked bills in the trailer show presidents named Thaddeus Waxman and Franklin Hardin — the same names used on currency in Red Dead Redemption 2. Rockstar''s shared universe easter egg strikes again.',
   'other', 'LoreLinker7', 18, now() - interval '4 days'),

  (25.7826, -80.1341, 'Basketball & beach volleyball confirmed on Ocean Drive',
   'Official screenshots and trailer footage confirm pickup basketball courts and beach volleyball right along the Ocean-Drive-style strip. Activity hub, not just a backdrop.',
   'location', 'MiamiMapper16', 29, now() - interval '5 days'),

  (25.7600, -80.5000, 'Fishing confirmed near the Everglades edge',
   'A screenshot confirms fishing as an activity, likely tied to the Grassrivers region out toward the swamp side of the map. Bring a rod, not just a gun.',
   'location', 'EvergladesEcho4', 15, now() - interval '6 days'),


  (25.7743, -80.1690, 'Port Gellhorn = a fictionalized PortMiami?',
   'One of the six officially named regions. Placement and industrial dockyard aesthetic line up closely with real PortMiami on Dodge Island.',
   'location', 'DocksideDiver60', 11, now() - interval '7 days'),

  (25.6500, -80.4800, 'Grassrivers = the Everglades',
   'Rockstar confirmed six regions for Leonida: Vice City, Leonida Keys, Grassrivers, Mount Kalaga, Port Gellhorn, and Ambrosia. Grassrivers is the obvious Everglades/wetlands analog — swamp buggies incoming.',
   'location', 'SwampRunner7', 19, now() - interval '8 days'),


  (25.7826, -80.1345, 'Release date locked: November 19, 2026',
   'Official: GTA6 launches November 19, 2026 on PS5 and Xbox Series X|S. Not long now.',
   'other', 'CountdownKing19', 52, now() - interval '12 days');
