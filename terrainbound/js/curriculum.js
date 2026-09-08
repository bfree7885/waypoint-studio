/**
 * Internal curriculum lookup. Never render this to the player.
 */

export function loadCurriculumMap(placeholders) {
  const byId = new Map(placeholders.slots.map((slot) => [slot.id, slot]));
  return {
    status: placeholders.status,
    disclaimer: placeholders.disclaimer,
    playerVisible: placeholders.playerVisible === true,
    slots: placeholders.slots,
    byId
  };
}

export function slotsFor(curriculum, ids) {
  return (ids || [])
    .map((id) => curriculum.byId.get(id))
    .filter(Boolean);
}

export function slotsForMission(curriculum, mission) {
  return slotsFor(curriculum, mission.curriculumSlotIds);
}

export function slotsForDiscovery(curriculum, discovery) {
  return slotsFor(curriculum, discovery.curriculumSlotIds);
}

export function assertNoPlayerFacingCodes(mission, curriculum, catalog = null) {
  const forbidden = /\b[A-Z]{1,4}-ESS\d-\d+\b/;
  const playerText = [
    mission.title,
    ...mission.intro.lines,
    ...mission.observations.flatMap((item) => [item.title, item.text, item.prompt]),
    mission.conclusion.prompt,
    mission.conclusion.successText,
    mission.conclusion.uphillHint,
    mission.conclusion.incompleteHint,
    mission.conclusion.unobservedHint
  ];
  if (catalog) {
    playerText.push(...(catalog.wren?.idle || []), catalog.wren?.missionNudge, catalog.wren?.afterComplete);
    for (const item of catalog.items) {
      playerText.push(item.name, item.prompt, item.text, item.location, item.wrenHint, item.wrenAck);
    }
  }
  const joined = playerText.filter(Boolean).join("\n");
  return {
    hasOfficialLookingCode: forbidden.test(joined),
    curriculumHidden: curriculum.playerVisible !== true,
    pendingSlots: curriculum.slots.every(
      (slot) => slot.placeholderAlignment && slot.placeholderAlignment.code === null
    )
  };
}
