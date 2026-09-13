/**
 * Stylized field explorer + Wren. Poses must read at gameplay camera distance.
 * States: idle | walk | inspect | measure | tablet | talk | sky
 */

export const POSE_MS = {
  idle: 0,
  walk: 0,
  inspect: 900,
  measure: 980,
  tablet: 1100,
  talk: 720,
  sky: 1200
};

export const DEFAULT_APPEARANCE = {
  skin: "sand",
  hair: "short-dark",
  jacket: "clay"
};

const SKIN = {
  sand: "#f0c09a",
  clay: "#c6865a",
  umber: "#8d5a3c"
};

const HAIR = {
  "short-dark": { color: "#2a1c14", style: "short" },
  "bun-auburn": { color: "#6b3a1c", style: "bun" },
  "bangs-black": { color: "#1a1410", style: "bangs" }
};

const JACKET = {
  clay: "#c45c26",
  pine: "#2a6b5a",
  slate: "#3d4f66"
};

export function normalizeAppearance(raw) {
  return {
    skin: SKIN[raw?.skin] ? raw.skin : DEFAULT_APPEARANCE.skin,
    hair: HAIR[raw?.hair] ? raw.hair : DEFAULT_APPEARANCE.hair,
    jacket: JACKET[raw?.jacket] ? raw.jacket : DEFAULT_APPEARANCE.jacket
  };
}

export function appearanceColors(appearance) {
  const a = normalizeAppearance(appearance);
  return {
    skin: SKIN[a.skin],
    hair: HAIR[a.hair].color,
    hairStyle: HAIR[a.hair].style,
    jacket: JACKET[a.jacket]
  };
}

export function poseFromIntent({ moving, journalOpen, talking, pose }) {
  if (talking) return "talk";
  if (pose === "inspect" || pose === "measure" || pose === "sky" || pose === "tablet") return pose;
  if (journalOpen && !moving && pose !== "walk") return "tablet";
  if (moving || pose === "walk") return "walk";
  return "idle";
}

function bootShadow(ctx, night, wide) {
  ctx.fillStyle = night ? "rgba(6, 8, 18, 0.5)" : "rgba(30, 40, 20, 0.3)";
  ctx.beginPath();
  ctx.ellipse(wide ? 4 : 0, 16, wide ? 24 : 18, wide ? 6 : 7, wide ? 0.35 : 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHair(ctx, style, color, bob, dir, headY) {
  ctx.fillStyle = color;
  if (style === "bun") {
    ctx.beginPath();
    ctx.arc(-1, headY - 5, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-dir * 2, headY - 12, 5.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "bangs") {
    ctx.beginPath();
    ctx.arc(0, headY - 2, 11, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-11, headY - 4, 22, 8);
  } else {
    ctx.beginPath();
    ctx.arc(-1, headY - 4, 10.5, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
  }
}

function drawTablet(ctx, x, y, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt || 0);
  ctx.fillStyle = "#1c2a28";
  ctx.fillRect(-10, -14, 20, 24);
  ctx.fillStyle = "#d7efe6";
  ctx.fillRect(-8, -11, 16, 17);
  ctx.strokeStyle = "#8a6238";
  ctx.lineWidth = 1;
  ctx.strokeRect(-10, -14, 20, 24);
  ctx.restore();
}

function drawRod(ctx, x0, y0, x1, y1) {
  ctx.strokeStyle = "#5a3e22";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.fillStyle = "#d8c09a";
  ctx.beginPath();
  ctx.arc(x1, y1, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawExplorer(ctx, x, y, opts) {
  const {
    facing = 1,
    time = 0,
    reduced = false,
    pose = "idle",
    appearance,
    night = false
  } = opts;
  const pal = appearanceColors(appearance);
  const dir = facing >= 0 ? 1 : -1;
  const moving = pose === "walk";
  const inspect = pose === "inspect";
  const measure = pose === "measure";
  const sky = pose === "sky";
  const talk = pose === "talk";
  const tablet = pose === "tablet";
  const cycle = reduced || !moving ? 0 : time * 7.1;
  const wave = reduced || !moving ? 0 : Math.sin(cycle);
  const strideAmp = 20;
  const stride = wave === 0 ? 0 : (Math.abs(wave) < 0.22 ? 0.22 * Math.sign(wave) : wave) * strideAmp;
  const bob = reduced
    ? 0
    : inspect
      ? 8
      : sky
        ? -3.2
        : moving
          ? Math.abs(wave) * 5.2
          : Math.sin(time * 1.7) * 0.8;
  const lean = inspect ? 0.32 * dir : sky ? -0.42 : talk ? 0.1 * dir : moving ? dir * 0.1 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.32, 1.32);
  ctx.rotate(lean);
  bootShadow(ctx, night, moving || inspect);

  const leftFoot = moving ? stride : inspect ? 5 : 0;
  const rightFoot = moving ? -stride : inspect ? -3 : 0;
  const leftLift = moving ? Math.max(0, -wave) * 6 : 0;
  const rightLift = moving ? Math.max(0, wave) * 6 : 0;
  ctx.strokeStyle = "#2a241c";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 0 + bob + (inspect ? 5 : 0));
  ctx.lineTo(-8 + leftFoot, 17 + bob - leftLift);
  ctx.moveTo(5, 0 + bob + (inspect ? 5 : 0));
  ctx.lineTo(8 + rightFoot, 17 + bob - rightLift);
  ctx.stroke();
  ctx.fillStyle = "#2a241c";
  ctx.beginPath();
  ctx.ellipse(-8 + leftFoot, 18 + bob - leftLift, 6.5, 3.4, moving ? dir * 0.25 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8 + rightFoot, 18 + bob - rightLift, 6.5, 3.4, moving ? dir * 0.25 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3d4a56";
  ctx.fillRect(-12 + leftFoot * 0.5, -2 + bob + (inspect ? 5 : 0) - leftLift * 0.4, 10, 13);
  ctx.fillRect(2 + rightFoot * 0.5, -2 + bob + (inspect ? 5 : 0) - rightLift * 0.4, 10, 13);

  ctx.fillStyle = "#5a3e22";
  ctx.beginPath();
  ctx.moveTo(-6 - dir * 10, -18 + bob + (moving ? wave * 3.2 : 0));
  ctx.lineTo(4 - dir * 10, -18 + bob);
  ctx.lineTo(6 - dir * 11, -4 + bob);
  ctx.lineTo(-8 - dir * 11, -4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c4a06a";
  ctx.fillRect(-3 - dir * 11, -16 + bob, 6, 4);

  ctx.fillStyle = pal.jacket;
  ctx.fillRect(-14, -20 + bob + (inspect ? 3 : 0), 28, 22);
  ctx.fillStyle = "rgba(20, 28, 18, 0.2)";
  ctx.fillRect(-14, -8 + bob, 28, 4);
  ctx.fillStyle = "#e8d7a8";
  ctx.fillRect(-8, -18 + bob, 6, 5);
  ctx.fillRect(2, -18 + bob, 6, 5);

  const armSwing = moving ? Math.sin(cycle + Math.PI) * 30 : 0;
  ctx.fillStyle = pal.jacket;
  if (!tablet && !measure && !sky) {
    ctx.save();
    ctx.translate(-11, -14 + bob);
    ctx.rotate((armSwing * Math.PI) / 180);
    ctx.fillRect(dir < 0 ? -3 : -8, 0, 8, 16);
    ctx.restore();
    ctx.save();
    ctx.translate(11, -14 + bob);
    ctx.rotate((-armSwing * Math.PI) / 180);
    ctx.fillRect(dir < 0 ? -5 : -5, 0, 8, 16);
    ctx.restore();
  }

  const headY = sky ? -40 + bob : inspect ? -20 + bob : -32 + bob;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(sky ? dir * 3 : inspect ? dir * 2 : 0, headY, 11, 0, Math.PI * 2);
  ctx.fill();
  drawHair(ctx, pal.hairStyle, pal.hair, bob, dir, headY);
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.arc((sky ? dir * 6 : dir * 4), headY + (sky ? -3 : inspect ? 2 : 0), 2, 0, Math.PI * 2);
  ctx.fill();

  if (tablet) {
    drawTablet(ctx, dir * 2, -12 + bob, 0.05 * dir);
    ctx.fillStyle = pal.skin;
    ctx.fillRect(dir * 10, -16 + bob, 6, 8);
    ctx.fillRect(-dir * 12, -10 + bob, 6, 8);
  } else if (measure) {
    drawRod(ctx, dir * 10, -8 + bob, dir * 28, 14 + bob);
    ctx.fillStyle = pal.skin;
    ctx.fillRect(dir * 6, -8 + bob, 7, 8);
  } else if (sky) {
    ctx.fillStyle = pal.skin;
    ctx.fillRect(-16, -34 + bob, 8, 11);
    ctx.fillRect(8, -36 + bob, 8, 11);
  } else if (inspect) {
    ctx.fillStyle = pal.skin;
    ctx.fillRect(dir * 12, 0 + bob, 7, 8);
  } else if (talk) {
    ctx.fillStyle = pal.skin;
    ctx.fillRect(dir * 12, -16 + bob, 6, 7);
  }
  ctx.restore();
}

export function drawWren(ctx, x, y, opts = {}) {
  const { time = 0, reduced = false, night = false, pose = "idle", facing = -1 } = opts;
  const bob = reduced ? 0 : pose === "talk" ? Math.sin(time * 6) * 0.8 : Math.sin(time * 1.9) * 1.1;
  const dir = facing >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.18, 1.18);
  bootShadow(ctx, night, false);
  ctx.fillStyle = "#3a3224";
  ctx.fillRect(-8, 5 + bob, 7, 9);
  ctx.fillRect(1, 5 + bob, 7, 9);
  ctx.fillStyle = "#3d4a32";
  ctx.fillRect(-9, -1 + bob, 18, 13);
  ctx.fillStyle = "#c4a35a";
  ctx.fillRect(-11, -18 + bob, 22, 18);
  ctx.fillStyle = "#6b4424";
  ctx.fillRect(-3, -16 + bob, 8, 10);
  ctx.fillStyle = "#5c4030";
  ctx.fillRect(-13, -36 + bob, 26, 7);
  ctx.fillRect(-8, -43 + bob, 16, 8);
  ctx.fillStyle = "#e0a070";
  ctx.beginPath();
  ctx.arc(0, -26 + bob, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2a1c";
  ctx.beginPath();
  ctx.arc(-1, -30 + bob, 8.5, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.arc(dir * 3, -26 + bob, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a5c3a";
  ctx.fillRect(dir * 10, -8 + bob, 5, 7);
  ctx.restore();
}

export const CHARACTER_STATES = ["idle", "walk", "inspect", "measure", "tablet", "talk", "sky"];
export const WALK_READABLE = true;
