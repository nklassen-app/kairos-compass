# Compass

The morning card: my two quarterly goals, why each matters, and one rule
for today — *if ___, then ___* — written in the morning so a plan made cold
is in front of me in the heat of the day. It is not Horizons on a phone: no
cascade, no plans, no programs, no link to Horizons or the Cockpit. No
streaks or scores. (Epic *Compass* in `kairos-system/BACKLOG.md`.)

Local-first single page, no build step, no dependencies, no account. Hosted on
GitHub Pages and wrapped in a Capacitor shell for the phone, the same way as
The Floor (`kairos-floor`) and Whiteboard (`kairos-whiteboard`). Scaffolded
from `kairos-foundation/templates/phone-app`.

## The rules

1. **This quarter** holds exactly two goals, each with one line on why it
   matters. They are typed on the phone, never in this repo — the repo is
   public and the goals are personal.
2. **Today** holds one rule: *if ___, then ___*. Both halves are required;
   it then reads as one sentence for the rest of the day.
3. Any text is edited by tapping it. Enter or tapping away saves; Escape or
   an empty field keeps the original — editing never deletes.
4. The rule belongs to the local calendar day. At midnight the card starts
   blank again; earlier days' rules are kept on the device (for the midday
   check-in and evening capture still to come), not shown.
5. State is one JSON document in `localStorage` under `compass:v1`, on one
   device: `{ goals: [{text, why}, {text, why}], days: {'YYYY-MM-DD': {if,
   then, at}} }`. No backup, no sync.

## Run locally

Serve the folder over HTTP (service workers don't register from `file://`):

```sh
python3 -m http.server 8080          # then open http://<this machine's LAN IP>:8080 on the phone
```

## Test

```sh
cd tests && npm install && npm test  # DOM-level: index.html booted in jsdom under node's test runner
```

## Deploy

Create the **public** repo `nklassen-app/kairos-compass` (Foundation Charter Part 7,
the public-repo rule — content-read before every push), push `main`, enable
GitHub Pages from `main` / root. The page is then at
<https://nklassen-app.github.io/kairos-compass/> and the phone shell points at it.
Bump `CACHE` in `sw.js` (`compass-vN`) **and** the `.ver` marker in
`index.html` with every content change, or the app keeps serving the stale page.

The Android shell lives in `native/`; see `native/README.md`. It only needs
building once, and rebuilding for shell changes (icon, app name, config).
