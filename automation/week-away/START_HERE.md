# Start automation before you leave

This guide sets up **7 days of small, autonomous improvements** to Waypoint Studio while you are away.

You have two options. **Option A is recommended** — it does not depend on your computer staying on.

---

## Option A — Cursor Automations (recommended)

Cursor can run a **cloud agent on a schedule** that clones your repo, makes one improvement, commits, and pushes.

### Before you leave (15 minutes)

1. **Land any local work** (see “Pre-flight” below).

2. **Open Cursor Automations**  
   - In Cursor: Agents → Automations, or  
   - Browser: [cursor.com/automations](https://cursor.com/automations)

3. **Create a new automation**
   - **Name:** `Waypoint Studio — Week Away`
   - **Trigger:** Scheduled → **Daily** (pick a time, e.g. 8:00 AM your timezone)
   - **Repository:** `bfree7885/waypoint-studio` (or your fork), branch `main`
   - **Runs:** 7 times — set end date one week out, or disable manually when you return

4. **Paste the agent instructions**  
   Open `automation/week-away/AGENT_PROMPT.md` in this repo, copy the entire file, and paste it into the automation prompt field.

5. **Save and enable** the automation.

6. **Verify GitHub access**  
   Cursor cloud agents need GitHub connected (Settings → Integrations). The agent must be allowed to push to `main`.

7. **Optional:** Run the automation **once manually** (“Run now”) and confirm a commit appears on GitHub.

### While you are away

- Agents run in the cloud — **your PC can sleep or stay on**; either works.
- Each day: one commit + `automation/week-away/day-N-report.md`.
- Day 7 also creates `WEEK_AWAY_SUMMARY.md`.

### When you return

1. Open `WEEK_AWAY_SUMMARY.md`
2. Read `automation/week-away/day-*.md` reports
3. **Disable** the automation so it does not run forever

---

## Option B — Local cron + webhook (computer must stay on)

If you prefer triggering from this machine, use cron to call a **Cursor Automation webhook** (create the automation in Option A, add a **Webhook** trigger, copy the URL).

### Install daily trigger

```bash
cd ~/projects/waypoint-scenes
chmod +x automation/week-away/run-daily.sh
./automation/week-away/install-cron.sh
```

This runs `run-daily.sh` every day at 8:00 AM. The script:

- Runs syntax checks on dashboard JS
- Calls your webhook URL (if `WEBHOOK_URL` is set in `automation/week-away/.env`)
- Logs to `automation/week-away/logs/`

Create `automation/week-away/.env` (not committed):

```env
WEBHOOK_URL=https://your-cursor-automation-webhook-url
```

**Note:** The local script does **not** run AI by itself. It only validates and pings Cursor to start the cloud agent.

---

## Pre-flight (do this once, before leaving)

From the project root:

```bash
cd ~/projects/waypoint-scenes
git status                    # should be clean after setup commit
git pull origin main
git push origin main
```

Open http://localhost:8080/ and confirm the outdoor dashboard loads.

Set `state.json` → `weekStarted` to your departure date (optional):

```json
"weekStarted": "2026-06-01"
```

---

## What gets created each day

| Artifact | Purpose |
|----------|---------|
| `automation/week-away/day-N-report.md` | Daily log |
| `WEEK_AWAY_SUMMARY.md` | End of week (Day 7 only) |
| Git commit on `main` | The actual improvement |

---

## If something goes wrong

| Problem | Fix |
|---------|-----|
| No commits appearing | Check Cursor automation runs log; verify GitHub push permission |
| Push failed | Agent should `git pull --rebase origin main` — check branch protection |
| Task too big | Agent should stop at one task; read PLAYBOOK |
| You return early | Disable automation; read reports so far |

---

## Files in this folder

| File | Purpose |
|------|---------|
| `START_HERE.md` | This guide |
| `AGENT_PROMPT.md` | Paste into Cursor Automation |
| `PLAYBOOK.md` | Rules for the agent |
| `TASK_QUEUE.md` | 7 suggested daily tasks |
| `state.json` | Progress tracker |
| `run-daily.sh` | Local validation + webhook ping |
| `install-cron.sh` | Optional cron installer |

---

## Quick start (copy-paste)

```text
1. git push origin main
2. cursor.com/automations → New → Daily schedule
3. Repo: waypoint-studio, branch: main
4. Prompt: contents of automation/week-away/AGENT_PROMPT.md
5. Run once manually to verify
6. Leave — check GitHub commits when you return
```
