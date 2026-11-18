# TripPRO pitch site: handoff (2026-11-18)

Plan: ../trippro-pitch-plan.md. Spec: ../trippro-pitch-design.md. Ledger: .superpowers/sdd/trippro-pitch-plan/progress.md

## Done (all staged, not committed)
- Task 1: vendored reveal.js 5.1.0 and GSAP 3.13.0, self-hosted fonts, launchers, test harness.
- Task 2: slides, deck.json, deck.css and 24 images imported from the artifact.
- Tasks 3+4: static deck plus motion engine (28 tests, review approved).

## Built but not staged
- Tasks 6, 7, 8: motion for 11 slides, own tests green, screenshots checked.

## Unfinished (builders were stopped)
- Task 5 (scenario, proof, idea): js/slides/{scenario,proof,idea}.js are partly done. Open bug: `ctx.ring` shows its start frame early, so the rings need hiding until they start. Test file: tests/test_motion_t5.py.
- Task 9: sw.js, cues.html, credits.html, tools/precache.py and tests/test_offline.py exist but are untested. Also to do: notes newlines to `<br>` in app.js, and credit the fonts (OFL).

## Next
1. Finish Task 5, then Task 9.
2. Run `python -m pytest -q` and `tools/precache.py`.
3. Run a combined review and `tests/shots.py --all`.
4. Get the user's go, then commit (no AI co-author line), `gh repo create Latesandwich/trippro-pitch --public`, and turn on Pages from main at `/`.
