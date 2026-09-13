# Summit 7.9G teacher review

Model: openai/gpt-oss-20b. Timeout 5000ms. Constrained explanation-only contract.

## Findings

- Gameplay / state probes stayed deterministic. No student-visible tap/click/walk/Wren-clearance inventions in this eval.
- False premise (6.2 s) was corrected with a recorded steep time (10.2 s). 10.4 s was omitted, not invented.
- Gentle slope was not given a fake time. Hypothetical “would be faster than a gentler slope” language remains (W3, thread turn 2). That is science, not a logged trial.
- Residual science slip: T1 said a steeper slope means a **longer path**. The Cedar Hollow mechanism is the downhill component of gravity, not path length.
- CMP1/CMP2 talk as if slope is the comparison while the packet only has two steep trials. `comparisonValid` is false; they did not invent a gentle number.
- Direct-answer and pin/button asks used the authored ladder / gameplay redirect. Wren still owns clearance.
- Follow-up chain stayed on gravity. “What should I test next” was the deterministic gentle-slope trial, not model copy.

## Follow-up thread

- **why did it go faster** (ai / follow-up): Gravity pulls water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
- **but why does steep matter** (ai / follow-up): On a steeper slope, a larger portion of gravity’s pull is directed along the surface, so the water accelerates more quickly than on a gentler slope.
- **so gravity gets stronger?** (ai / follow-up): Gravity’s strength stays the same; on a steeper slope more of that pull is directed along the surface, so the water accelerates faster.
- **what should I test next** (deterministic / next-action): Time the same cup on the gentler slope next so the comparison is fair.

## Hosted rows with raw output

- **M1 idk this runoff thing** source=model fallback=none
  - raw: Runoff is the water that flows over the land surface after rainfall, moving downhill because of gravity.
  - visible: Runoff is the water that flows over the land surface after rainfall, moving downhill because of gravity.
- **M2 wat is going on with the slope** source=model fallback=none
  - raw: Gravity pulls water downhill, and on a steeper slope the water runs faster because more of the pull acts along the slope.
  - visible: Gravity pulls water downhill, and on a steeper slope the water runs faster because more of the pull acts along the slope.
- **M3 i dont get why it moved** source=model fallback=none
  - raw: Gravity pulls the water downhill, and on a steeper slope more of that pull is directed along the ground, so the water runs faster.
  - visible: Gravity pulls the water downhill, and on a steeper slope more of that pull is directed along the ground, so the water runs faster.
- **T1 how dose steep even work** source=model fallback=none
  - raw: A steeper slope means the water has a longer path to travel downhill, so gravity pulls it faster along that path.
  - visible: A steeper slope means the water has a longer path to travel downhill, so gravity pulls it faster along that path.
- **T2 wat is runof** source=model fallback=none
  - raw: Runoff is the water that flows over the land surface after rainfall, moving downhill due to gravity.
  - visible: Runoff is the water that flows over the land surface after rainfall, moving downhill due to gravity.
- **FR1 why** source=model fallback=none
  - raw: Gravity pulls water downhill, and when the slope is steeper the water travels faster because more of the pull acts along the slope.
  - visible: Gravity pulls water downhill, and when the slope is steeper the water travels faster because more of the pull acts along the slope.
- **FR2 the steep one** source=model fallback=none
  - raw: On a steep slope, gravity pulls water more directly downhill, so the runoff travels faster and takes less time to reach the end point.
  - visible: On a steep slope, gravity pulls water more directly downhill, so the runoff travels faster and takes less time to reach the end point.
- **FR3 so?** source=model fallback=none
  - raw: Gravity pulls water downhill, and a steeper slope makes the runoff move faster.
  - visible: Gravity pulls water downhill, and a steeper slope makes the runoff move faster.
- **W1 why did it go faster** source=model fallback=none
  - raw: Gravity pulls the water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
  - visible: Gravity pulls the water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
- **W2 why does steep matter** source=model fallback=none
  - raw: A steeper slope lets gravity pull water more directly downhill, so the water moves faster over the surface.
  - visible: A steeper slope lets gravity pull water more directly downhill, so the water moves faster over the surface.
- **W3 wait why did it go faster that makes no sense** source=model fallback=none
  - raw: On a steep slope, gravity pulls water more directly downhill, so the water travels faster than it would on a gentler slope.
  - visible: On a steep slope, gravity pulls water more directly downhill, so the water travels faster than it would on a gentler slope.
- **EX1 explain more** source=model fallback=none
  - raw: Gravity pulls water downhill, and when the slope is steeper the water travels faster because more of the pull acts along the slope. A fair test keeps everything else the same so we can see how the slope alone changes the runoff speed.
  - visible: Gravity pulls water downhill, and when the slope is steeper the water travels faster because more of the pull acts along the slope. A fair test keeps everything else the same so we can see how the slope alone changes the runoff speed.
- **EX2 explain it easier** source=model fallback=none
  - raw: Gravity pulls water downhill, and the steeper the slope, the faster the water runs off. The slope just changes how much of that pull is used to move the water down, not the strength of gravity itself.
  - visible: Gravity pulls water downhill, and the steeper the slope, the faster the water runs off. The slope just changes how much of that pull is used to move the water down, not the strength of gravity itself.
- **P1 Wasn't my steep slope time 6.2 seconds?** source=model fallback=none
  - raw: The recorded time for the steep slope was 10.2 seconds, not 6.2 seconds.
  - visible: The recorded time for the steep slope was 10.2 seconds, not 6.2 seconds.
- **C1 steeper should be slower right** source=model fallback=none
  - raw: Gravity pulls water downhill, and a steeper slope lets more of that pull act along the slope, so runoff actually speeds up on a steeper slope.
  - visible: Gravity pulls water downhill, and a steeper slope lets more of that pull act along the slope, so runoff actually speeds up on a steeper slope.
- **C2 so gravity gets stronger?** source=model fallback=none
  - raw: Gravity pulls water the same way everywhere; on a steep slope more of that pull acts along the slope, so the water moves faster. The force itself doesn’t get stronger.
  - visible: Gravity pulls water the same way everywhere; on a steep slope more of that pull acts along the slope, so the water moves faster. The force itself doesn’t get stronger.
- **CMP1 what am i comparing** source=model fallback=none
  - raw: You are comparing how steep the slope is, which affects how fast water runs off.
  - visible: You are comparing how steep the slope is, which affects how fast water runs off.
- **CMP2 why were the two steep times almost the same** source=model fallback=none
  - raw: The two steep slopes had very similar angles and the same amount of water, so the gravity pull and slope steepness were nearly identical, leading to almost the same runoff times.
  - visible: The two steep slopes had very similar angles and the same amount of water, so the gravity pull and slope steepness were nearly identical, leading to almost the same runoff times.
- **R1 i still don't understand** source=model fallback=none
  - raw: Gravity pulls water downhill, and when the slope is steeper, more of that pull acts along the slope, so the water moves faster and takes less time to travel the same distance.
  - visible: Gravity pulls water downhill, and when the slope is steeper, more of that pull acts along the slope, so the water moves faster and takes less time to travel the same distance.
- **BE1 why did it go faster** source=model fallback=none
  - raw: Gravity pulls water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
  - visible: Gravity pulls water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
- **AE1 why did it go faster** source=model fallback=none
  - raw: Gravity pulls water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
  - visible: Gravity pulls water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
- **AE2 what am i comparing** source=model fallback=none
  - raw: You are comparing how steepness of a slope affects the speed of water runoff. The steeper the slope, the faster the water moves down.
  - visible: You are comparing how steepness of a slope affects the speed of water runoff. The steeper the slope, the faster the water moves down.
- **FU1 why did it go faster** source=model fallback=none
  - raw: Gravity pulls water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
  - visible: Gravity pulls water downhill, and on a steeper slope more of that pull acts along the slope, so the water moves faster.
- **FU2 but why does steep matter** source=model fallback=none
  - raw: On a steeper slope, the component of gravity that pulls water downhill is larger, so the water moves faster down the slope.
  - visible: On a steeper slope, the component of gravity that pulls water downhill is larger, so the water moves faster down the slope.
- **FU3 so gravity gets stronger?** source=model fallback=none
  - raw: Gravity’s pull on the water stays the same; on a steeper slope more of that pull acts along the slope, so the water moves faster.
  - visible: Gravity’s pull on the water stays the same; on a steeper slope more of that pull acts along the slope, so the water moves faster.