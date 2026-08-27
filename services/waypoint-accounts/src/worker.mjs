/**
 * Cloudflare Worker entry. D1 + Stripe test mode + Resend.
 * Phase 2 refuses live Stripe keys.
 */
import { createApp } from "./app.mjs";
import { createD1Store } from "./store.mjs";
import { createStripeAdapter } from "./stripe.mjs";
import { createEmailAdapter } from "./email.mjs";

export default {
  async fetch(request, env) {
    const stripe = createStripeAdapter(env);
    const app = createApp({
      env: env,
      store: createD1Store(env.DB),
      stripe: stripe,
      email: createEmailAdapter(env)
    });
    return app.handle(request);
  }
};
