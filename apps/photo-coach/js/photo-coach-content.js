/**
 * Photo Coach — curated field content (real guidance, no placeholders)
 */
(function (global) {
  "use strict";

  var CONCEPTS = [
    {
      id: "leading-lines",
      title: "Leading lines",
      summary: "Lines in the scene draw the eye toward your subject — trails, rivers, fences, tree trunks, ridges, and shorelines all work.",
      why: "The human eye follows edges. When lines converge toward your subject, viewers feel pulled into the frame instead of wandering.",
      field: "Stand where the path or stream points at what matters. Low angles make foreground lines stronger.",
      diagram: "leading-lines"
    },
    {
      id: "foreground-interest",
      title: "Foreground interest",
      summary: "Place something meaningful close to the camera — rock, fern, flowers, ice — so the frame has depth from front to back.",
      why: "Without a near anchor, landscapes feel flat on screen. A foreground element creates a visual doorway into the scene.",
      field: "Get low and close. Use your 18mm end; focus one-third into the scene for depth of field.",
      diagram: "foreground"
    },
    {
      id: "negative-space",
      title: "Negative space",
      summary: "Deliberate empty areas — sky, fog, snow, calm water — give your subject room to breathe.",
      why: "Clutter competes for attention. Empty space isolates the subject and conveys mood: quiet, scale, solitude.",
      field: "When fog or snow simplifies the world, resist filling every corner. One strong shape is enough.",
      diagram: "negative-space"
    },
    {
      id: "rule-of-thirds",
      title: "Rule of thirds",
      summary: "Place horizons and subjects off-center, roughly on the lines that divide the frame into thirds.",
      why: "Centered compositions feel static. Off-center placement creates tension and balance that feels intentional.",
      field: "Enable the grid in your a6700 display. Put horizons on the upper or lower third — not the middle.",
      diagram: "thirds"
    },
    {
      id: "layering",
      title: "Layering",
      summary: "Stack visual planes — foreground, middle ground, background — so the image reads in depth.",
      why: "Layers mimic how we see the world. Each plane adds context: where we stand, what is near, what is far.",
      field: "In forest and mountain scenes, look for a near tree, a mid ridge, and distant peaks or sky.",
      diagram: "layering"
    },
    {
      id: "compression",
      title: "Compression",
      summary: "Longer focal lengths pull distant subjects closer together, making peaks, trees, or wildlife feel stacked.",
      why: "Telephoto perspective compresses space — useful when you want drama between layers or to isolate a subject.",
      field: "Zoom toward 135mm from a distance. Background mountains grow relative to foreground trees.",
      diagram: "compression"
    },
    {
      id: "framing",
      title: "Framing",
      summary: "Use natural frames — branches, archways, cave mouths, barn doors — to surround your subject.",
      why: "A frame focuses attention and adds context. It tells the viewer where to look without shouting.",
      field: "Step back until branches encircle the waterfall or barn. Expose for the subject inside the frame.",
      diagram: "framing"
    },
    {
      id: "patterns",
      title: "Patterns",
      summary: "Repeating shapes — tree trunks, waves, tiles, flock formation — create rhythm across the frame.",
      why: "Pattern pleases the eye until something breaks it. That break becomes the story.",
      field: "Fill the frame with repetition, then wait for one different element — a red leaf in green moss.",
      diagram: "patterns"
    },
    {
      id: "texture",
      title: "Texture",
      summary: "Surface detail — bark, rock, feathers, ice crystals — reads when side light rakes across it.",
      why: "Texture communicates touch and age. It makes photographs feel physical instead of generic.",
      field: "Shoot macro and landscapes in early or late light. Front light flattens texture; side light reveals it.",
      diagram: "texture"
    },
    {
      id: "light-direction",
      title: "Light direction",
      summary: "Where light comes from changes everything: front (flat), side (texture), back (silhouette and glow).",
      why: "Light is the primary material of photography. Direction defines shape, mood, and what survives in shadow.",
      field: "At golden hour, shoot with sun behind you for warm faces on landscape, or into the sun for rim light.",
      diagram: "light-direction"
    },
    {
      id: "color-harmony",
      title: "Color harmony",
      summary: "Related colors — autumn reds and golds, blue hour cool tones, green-on-green forest — feel cohesive.",
      why: "Harmonious palettes feel calm and professional. Clashing colors distract unless you use them deliberately.",
      field: "In autumn, simplify to two dominant hues. In fog, embrace a narrow gray-green range.",
      diagram: "color"
    },
    {
      id: "visual-weight",
      title: "Visual weight",
      summary: "Bright areas, saturated color, faces, and sharp detail feel heavier than dark, muted, soft regions.",
      why: "Balance is not symmetry — it is distributing weight. A small bright bird can balance a large dark rock.",
      field: "Before shooting, squint. Notice what dominates. Move until weight feels stable.",
      diagram: "weight"
    },
    {
      id: "balance",
      title: "Balance",
      summary: "Elements across the frame should feel stable — not necessarily equal, but none pulling the eye off the edge.",
      why: "Imbalance feels accidental. Balance feels crafted, even in wild landscapes.",
      field: "If a heavy tree sits left, seek a counterweight — mountain, cloud, or reflection — on the right.",
      diagram: "balance"
    },
    {
      id: "storytelling",
      title: "Storytelling",
      summary: "Strong photographs imply a moment — before, during, or after something happened.",
      why: "Viewers linger when they sense narrative: a trail into fog, tracks in snow, a bird about to lift off.",
      field: "Ask: what happened here? Shoot the evidence, not just the pretty view.",
      diagram: "story"
    },
    {
      id: "depth",
      title: "Depth",
      summary: "Depth is the feeling of space — created by overlap, focus falloff, haze, and scale cues.",
      why: "Cameras flatten the world. Depth often comes from rebuilding space with layers, focus, and atmosphere.",
      field: "Use f/8–f/11 on landscapes; include near and far objects that overlap. Mist adds natural depth.",
      diagram: "depth"
    },
    {
      id: "movement",
      title: "Movement",
      summary: "Implied or real motion — flowing water, wind in grass, bird flight — adds life to still images.",
      why: "Motion contrasts with the medium’s stillness. It creates energy and time.",
      field: "For silk water, use a tripod and 1/4–1 s shutter. For wildlife, 1/1000 s or faster.",
      diagram: "movement"
    }
  ];

  var CHECKLIST = [
    {
      q: "Is my horizon level?",
      why: "Tilted horizons feel careless unless the tilt is obvious and intentional. Use the a6700 level indicator or grid."
    },
    {
      q: "What is my subject?",
      why: "If you cannot name one subject in one sentence, the viewer will not know either. Clarity beats complexity."
    },
    {
      q: "Can I move closer?",
      why: "Beginners shoot too far away. Moving closer simplifies and strengthens the frame."
    },
    {
      q: "Can I simplify?",
      why: "Remove edge distractions by shifting a step left or right. Fewer elements mean stronger impact."
    },
    {
      q: "Is there distracting clutter?",
      why: "Bright trash, branches through heads, and merge lines on wildlife ruin otherwise good light."
    },
    {
      q: "Can I wait for better light?",
      why: "Light transforms the same scene. Ten minutes at golden hour beats an hour at noon."
    },
    {
      q: "Can I improve the foreground?",
      why: "A stronger near element is often the difference between snapshot and photograph."
    },
    {
      q: "Can I change height?",
      why: "Kneeling, standing on a rock, or lowering the tripod changes relationships between layers."
    },
    {
      q: "Can I rotate around the subject?",
      why: "A few degrees changes background and light angle. Circle before you settle."
    },
    {
      q: "Should I zoom?",
      why: "Telephoto isolates and compresses. Use it when the scene is busy or the subject is distant."
    },
    {
      q: "Should I shoot wider?",
      why: "Wide angle adds environment and depth — best when foreground interest is strong."
    }
  ];

  var EDITING = [
    {
      name: "Exposure",
      philosophy: "Exposure is the foundation — get as much right in camera, then nudge toward what you felt.",
      why: "The histogram shows data, not art. Protect highlights in RAW; lift shadows only when mood requires it."
    },
    {
      name: "Highlights",
      philosophy: "Highlights are easily lost forever in JPEG; recoverable in RAW within limits.",
      why: "Blown sky or water speculars distract. Pull highlights down to restore detail and calm."
    },
    {
      name: "Shadows",
      philosophy: "Shadows hold depth. Not every shadow needs opening.",
      why: "Lifting shadows reveals noise and flattens mood. Open only what supports the story."
    },
    {
      name: "Contrast",
      philosophy: "Contrast separates subject from background.",
      why: "Fog and overcast scenes need less; clear sunlit scenes may need gentle S-curves, not crushing."
    },
    {
      name: "Whites & blacks",
      philosophy: "Set true white and black points so the image has a full tonal range without clipping.",
      why: "Gray haze in snow or night scenes feels unfinished. A defined black anchor grounds the frame."
    },
    {
      name: "Color temperature",
      philosophy: "White balance is mood — warm for firelight and golden hour, cool for shade and blue hour.",
      why: "Cameras guess neutral. You choose what felt true or what serves the emotion."
    },
    {
      name: "Tint",
      philosophy: "Green-magenta tint fixes mixed light and forest shade.",
      why: "Uncorrected green cast in woodland reads as sickly. Small tint shifts restore natural foliage."
    },
    {
      name: "Texture & clarity",
      philosophy: "Texture enhances mid-frequency detail; clarity is stronger and can look harsh on faces and fog.",
      why: "Forests and rock benefit from subtle texture. Fog, waterfalls, and skin rarely do."
    },
    {
      name: "Dehaze",
      philosophy: "Dehaze cuts atmospheric scatter — use sparingly on distant ridges.",
      why: "Too much dehaze creates unnatural local contrast and halos. Atmosphere is often the point."
    },
    {
      name: "Cropping",
      philosophy: "Crop to strengthen composition, not to rescue a weak frame.",
      why: "A crop that removes distractions is good; a crop that fixes a missing subject is a reshoot."
    },
    {
      name: "Noise reduction",
      philosophy: "Reduce noise only until it stops distracting — then stop.",
      why: "Over-smoothing erases fine detail in feathers, bark, and stars. High ISO night work needs balance."
    },
    {
      name: "Sharpening",
      philosophy: "Output sharpening depends on size: screen, print, or gallery.",
      why: "Global oversharpening creates halos at edges. Sharpen what viewers will see at final size."
    },
    {
      name: "Lens corrections",
      philosophy: "Profile corrections fix distortion and vignette from your lens.",
      why: "Wide angles at 18mm bend lines at edges; corrections keep horizons and barns honest."
    }
  ];

  var GEAR = {
    camera: {
      name: "Sony a6700",
      body: "APS-C mirrorless with 26 MP sensor, in-body stabilization, and advanced subject detection autofocus.",
      points: [
        "Shoot RAW + JPEG until you understand RAW workflow — RAW preserves highlight and shadow latitude.",
        "Use Creative Style Neutral or Standard for natural color; adjust in post, not in camera, while learning.",
        "Face/Eye AF and Animal Eye AF help wildlife — but composition and light still matter more.",
        "11 fps mechanical shutter helps birds in flight; silent electronic shutter reduces disturbance.",
        "IBIS helps handheld in forest shade — still use a tripod for waterfalls and blue hour.",
        "4K video is available; for still photography mastery, prioritize stills first."
      ]
    },
    lens: {
      name: "Sony E 18–135mm f/3.5–5.6 OSS",
      body: "Versatile zoom for hiking — wide for landscapes, long end for wildlife and compression.",
      points: [
        "18mm: forests, barns, trails — include foreground within a few feet.",
        "50–70mm: natural perspective for intimate landscapes and details.",
        "135mm: distant wildlife and compressed mountain layers — mind slower aperture at long end.",
        "OSS stabilization helps handheld telephoto; still favor faster shutter for birds.",
        "Aperture peaks around f/8 for sharp landscapes on APS-C — diffraction softens past f/11.",
        "Keep front element clean — forest mist and spray stick to glass."
      ]
    },
    essentials: [
      {
        name: "Battery",
        tip: "Cold drains power fast. Carry a spare warm in an inner pocket; rotate before the camera dies mid-hike."
      },
      {
        name: "Tripod",
        tip: "Essential for waterfalls, blue hour, and macro. Light carbon is worth it on long trails."
      },
      {
        name: "Filters",
        tip: "Circular polarizer deepens sky and controls reflections on water — rotate while watching the viewfinder."
      },
      {
        name: "Histogram",
        tip: "Enable live histogram. Peaks on the right without clipping usually mean healthy exposure for landscapes."
      },
      {
        name: "Focus peaking",
        tip: "Manual focus aid for macro and night — highlights in-focus edges in color."
      },
      {
        name: "Exposure compensation",
        tip: "Snow and bright fog need +1 to +2 EV. Dark forest scenes may need negative compensation."
      },
      {
        name: "Drive modes",
        tip: "Single for landscapes; continuous for wildlife. Burst when behavior is unpredictable."
      }
    ]
  };

  var SEASONAL_OPPORTUNITIES = [
    { id: "valley-fog", title: "Morning fog in valleys", seasons: ["spring", "fall"], months: [4, 5, 9, 10],
      note: "Cool nights and humid air pool fog in valleys — arrive before sunrise as it lifts." },
    { id: "waterfall-flow", title: "Waterfall conditions", seasons: ["spring", "fall"], months: [3, 4, 5, 10, 11],
      note: "After rain, cascades swell. Overcast light reduces contrast on white water." },
    { id: "bird-activity", title: "Bird activity", seasons: ["spring", "summer", "fall"], months: [4, 5, 6, 9],
      note: "Migration and nesting increase dawn chorus — forest edges and water are productive." },
    { id: "macro-floor", title: "Macro opportunities", seasons: ["spring", "summer", "fall"], months: [5, 6, 7, 8, 9],
      note: "Fungi, ferns, and insects reward soft overcast and post-rain moisture." },
    { id: "storm-light", title: "Storm light", seasons: ["spring", "summer"], months: [5, 6, 7, 8],
      note: "Breaks after storms can paint dramatic skies — safety first, never on exposed ridges." },
    { id: "fresh-snow", title: "Fresh snow", seasons: ["winter"], months: [12, 1, 2, 3],
      note: "Snow simplifies the world. Expose bright; shoot before footprints and melt." },
    { id: "autumn-color", title: "Autumn color", seasons: ["fall"], months: [9, 10, 11],
      note: "Peak color moves by elevation — ridges before valleys in Pennsylvania hills." },
    { id: "river-reflections", title: "River reflections", seasons: ["fall", "spring"], months: [4, 5, 9, 10],
      note: "Calm wind at blue hour doubles color on still bends and ponds." },
    { id: "ice-frost", title: "Ice & frost", seasons: ["winter"], months: [12, 1, 2],
      note: "Hoarfrost at dawn on branches and grass — macro and telephoto both work." },
    { id: "wildflowers", title: "Wildflowers", seasons: ["spring", "summer"], months: [5, 6, 7],
      note: "Open meadows and trail margins — low angle, shallow depth, overcast preferred." },
    { id: "wildlife-movement", title: "Wildlife movement", seasons: ["fall", "winter"], months: [10, 11, 12, 1, 2],
      note: "Deer and birds are more visible as leaves drop — dawn and dusk remain prime." },
    { id: "night-sky", title: "Night skies", seasons: ["summer", "fall"], months: [6, 7, 8, 9, 10],
      note: "New moon weeks and clear horizons — Milky Way core is summer; autumn for earlier night." }
  ];

  function getConcepts() { return CONCEPTS.slice(); }
  function getConceptById(id) {
    for (var i = 0; i < CONCEPTS.length; i++) {
      if (CONCEPTS[i].id === id) return CONCEPTS[i];
    }
    return CONCEPTS[0];
  }
  function getChecklist() { return CHECKLIST.slice(); }
  function getEditing() { return EDITING.slice(); }
  function getGear() { return GEAR; }
  function getSeasonalForDate(d) {
    d = d || new Date();
    var m = d.getMonth() + 1;
    var season = global.PhotoCoachUtil ? global.PhotoCoachUtil.seasonForMonth(m) : "spring";
    return SEASONAL_OPPORTUNITIES.filter(function (opp) {
      if (opp.months && opp.months.indexOf(m) >= 0) return true;
      return opp.seasons && opp.seasons.indexOf(season) >= 0;
    });
  }

  global.PhotoCoachContent = {
    getConcepts: getConcepts,
    getConceptById: getConceptById,
    getChecklist: getChecklist,
    getEditing: getEditing,
    getGear: getGear,
    getSeasonalForDate: getSeasonalForDate
  };
})(window);
