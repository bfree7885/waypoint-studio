# Summit supervised field test

This is a **small, opt-in observation pass**. It is not a production default, not a classroom rollout, and not an unsupervised deployment.

GPT-OSS 20B remains the language layer only. TerrainBound still owns game state, measurements, next actions, and Wren clearance.

## Activation

Open Cedar Hollow with:

```
/terrainbound/?summit=fieldtest
```

Developer captures may also use `field=1` for `window.TB`. Hosted Summit still requires the loopback proxy (`data/summit/provider.json` `proxyEndpoint`).

Without `?summit=fieldtest`, Summit behavior is unchanged. Hosted GPT-OSS is **not** the default.

The Summit panel shows an internal **FIELD TEST** mark and optional observer controls. Students in a normal session never see those controls.

## What to tell the tester

Start a fresh Cedar Hollow. Then say, as close as possible:

> Explore Cedar Hollow and complete the investigation. Summit is available if you want help. Use it however feels natural.

Do **not** coach specific Summit wording. Do not tell them which questions to ask. Stay quiet unless they are truly stuck.

## Observer role

- Watch. Do not play the investigation for them.
- Optional marks after a Summit reply: Helped, Confusing, Too much, Wrong, Other.
- An optional short observer note is allowed. Do not gamify the marks.
- Prefer not interrupting after every reply.

## After the session

1. Export **JSON** and the **Markdown summary** from the Summit field-test controls.
2. Files look like `terrainbound-fieldtest-<session-id>.json` and `.md`.
3. Keep transcripts local. Do not upload them except the hosted Summit request itself.

## Short debrief

Ask only:

- Did Summit help you understand what was happening?
- Was anything Summit said confusing?
- Did Summit ever give away too much?
- Was there anything you wanted to ask that it could not answer?
- Did Summit feel like part of the game or like a separate chatbot?
- Would you use it again if you were stuck?

Do not run a long survey.

## Privacy

The log uses a random local session id. It must not include name, email, account, IP, school, or API credentials. Student questions are stored only as typed in the game, with secrets/emails redacted.

## What “success” means

A plausible Summit sentence is not enough. The log also records whether the player then completed a required action, earned evidence, revised an explanation, or progressed a puzzle — from TerrainBound state, not from the model.
