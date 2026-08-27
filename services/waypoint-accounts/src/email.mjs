export function createEmailAdapter(env) {
  const sent = [];
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM || "Waypoint Ambient <ambient@waypointstudio.org>";
  return {
    sent: sent,
    async sendMagicLink({ to, url }) {
      const subject = "Sign in to Waypoint Ambient";
      const text =
        "Use this link to sign in to Waypoint. It expires in 15 minutes and can be used once.\n\n" +
        url +
        "\n\nIf you did not request this, you can ignore the email.";
      const html =
        "<p>Use this link to sign in to Waypoint. It expires in 15 minutes and can be used once.</p>" +
        '<p><a href="' +
        escapeHtml(url) +
        '">Sign in</a></p>' +
        "<p>If you did not request this, you can ignore the email.</p>";
      const record = { to: to, subject: subject, url: url, at: new Date().toISOString() };
      sent.push(record);
      env.__lastMagicLink = record;
      if (!key || env.STRIPE_MODE === "mock") {
        return { ok: true, delivered: false, reason: "captured" };
      }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: from, to: [to], subject: subject, text: text, html: html })
      });
      if (!res.ok) {
        return { ok: false, delivered: false, reason: "provider" };
      }
      return { ok: true, delivered: true };
    }
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}
