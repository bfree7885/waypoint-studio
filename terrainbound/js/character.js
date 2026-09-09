/**
 * Stylized field explorer + Wren. Animation states are short and reusable.
 * States: idle | walk | inspect | measure | tablet | talk | sky
 */

export const POSE_MS = {
  idle: 0,
  walk: 0,
  inspect: 720,
  measure: 820,
  tablet: 900,
  talk: 640,
  sky: 1100
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
  if (journalOpen && !moving) return "tablet";
  if (pose && pose !== "idle" && pose !== "walk") return pose;
  return moving ? "walk" : "idle";
}

function bootShadow(ctx, night) {
  ctx.fillStyle = night ? "rgba(6, 8, 18, 0.45)" : "rgba(30, 40, 20, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 13, 17, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHair(ctx, style, color, bob, dir) {
  ctx.fillStyle = color;
  if (style === "bun") {
    ctx.beginPath();
    ctx.arc(-1, -33 + bob, 9, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-dir * 2, -40 + bob, 5.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "bangs") {
    ctx.beginPath();
    ctx.arc(0, -30 + bob, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-10, -32 + bob, 20, 7);
  } else {
    ctx.beginPath();
    ctx.arc(-1, -32 + bob, 9.5, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
  }
}

function drawTablet(ctx, dir, bob, raised) {
  const x = raised ? dir * 7 : dir * 11;
  const y = raised ? -18 + bob : -8 + bob;
  ctx.fillStyle = "#1c2a28";
  ctx.fillRect(x, y, 9, 12);
  ctx.fillStyle = "#d7efe6";
  ctx.fillRect(x + 1.4, y + 1.6, 6.2, 8.4);
  ctx.strokeStyle = "#8a6238";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x, y, 9, 12);
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
  const bob = reduced
    ? 0
    : inspect
      ? 4
      : sky
        ? -1.4
        : moving
          ? Math.sin(time * 11) * 2.1
          : Math.sin(time * 1.7) * 0.7;
  const stride = reduced || !moving ? 0 : Math.sin(time * 11) * 5.4;
  ctx.save();
  ctx.translate(x, y);
  bootShadow(ctx, night);

  ctx.fillStyle = "#2a241c";
  ctx.fillRect(-8 + stride * 0.18, 5 + bob, 7, 9);
  ctx.fillRect(1 - stride * 0.18, 5 + bob, 7, 9);
  ctx.fillStyle = "#4a5560";
  ctx.fillRect(-9 + stride * 0.15, -1 + bob + (inspect ? 3 : 0), 8, 12);
  ctx.fillRect(1 - stride * 0.15, -1 + bob + (inspect ? 3 : 0), 8, 12);

  ctx.fillStyle = pal.jacket;
  ctx.fillRect(-11, -18 + bob + (inspect ? 2 : 0), 22, 18);
  ctx.fillStyle = "rgba(20, 28, 18, 0.18)";
  ctx.fillRect(-11, -8 + bob, 22, 3);
  ctx.fillStyle = "#e8d7a8";
  ctx.fillRect(-7, -16 + bob, 5, 4);
  ctx.fillRect(2, -16 + bob, 5, 4);

  ctx.fillStyle = "#6b4424";
  ctx.fillRect(-6 - dir * 10, -15 + bob, 10, 13);
  ctx.fillStyle = "#c4a06a";
  ctx.fillRect(-4 - dir * 10, -13 + bob, 6, 4);

  ctx.fillStyle = pal.skin;
  const headY = sky ? -31 + bob : inspect ? -20 + bob : -28 + bob;
  ctx.beginPath();
  ctx.arc(sky ? dir * 2 : 0, headY, 9.5, 0, Math.PI * 2);
  ctx.fill();
  drawHair(ctx, pal.hairStyle, pal.hair, bob + (sky ? -3 : inspect ? 6 : 0), dir);
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.arc((sky ? dir * 4 : dir * 3.2), headY + (sky ? -2 : 0), 1.7, 0, Math.PI * 2);
  ctx.fill();

  if (tablet || measure || sky) drawTablet(ctx, dir, bob, sky || measure);
  if (inspect) {
    ctx.fillStyle = pal.skin;
    ctx.fillRect(dir * 10, -6 + bob, 5, 6);
  }
  if (talk) {
    ctx.fillStyle = pal.skin;
    ctx.fillRect(dir * 9, -14 + bob, 4, 5);
  }
  ctx.restore();
}

export function drawWren(ctx, x, y, opts = {}) {
  const { time = 0, reduced = false, night = false, pose = "idle", facing = -1 } = opts;
  const bob = reduced ? 0 : pose === "talk" ? Math.sin(time * 6) * 0.8 : Math.sin(time * 1.9) * 1.1;
  const dir = facing >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  bootShadow(ctx, night);
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
