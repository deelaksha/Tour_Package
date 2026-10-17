/**
 * Sanity checks for the journey choreography: every traveler's action list is
 * in chronological order, boarding completes before each door closes, and
 * nobody exits before the bus has stopped. Run with `npm run test`.
 */
import assert from "node:assert/strict";
import { SCRIPTS, evaluateTraveler, createFrame } from "../lib/animation/choreography";
import { T } from "../lib/config/journeyScenes";
import { S_PICKUP, S_COAST, S_HOME, BUS_PATH_LENGTH } from "../lib/config/route";

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n       ${(e as Error).message}`);
  }
}

console.log(`path length ${BUS_PATH_LENGTH.toFixed(1)} m · pickup ${S_PICKUP.toFixed(1)} · coast ${S_COAST.toFixed(1)} · home ${S_HOME.toFixed(1)}`);

check("bus anchors are ordered along the path", () => {
  assert.ok(S_PICKUP < S_COAST && S_COAST < S_HOME);
});

SCRIPTS.forEach((script, k) => {
  const acts = script.actions;
  check(`traveler ${k}: actions are chronological`, () => {
    for (let i = 1; i < acts.length; i++) {
      const prev = acts[i - 1];
      const prevEnd = "end" in prev ? prev.end : prev.start;
      assert.ok(acts[i].start >= prevEnd - 1e-6, `action ${i} (${acts[i].kind}) starts ${acts[i].start.toFixed(2)} before previous ends ${prevEnd.toFixed(2)}`);
    }
  });
  const boards = acts.filter((a) => a.kind === "board");
  const exits = acts.filter((a) => a.kind === "exit");
  check(`traveler ${k}: boards twice, exits twice`, () => {
    assert.equal(boards.length, 2);
    assert.equal(exits.length, 2);
  });
  check(`traveler ${k}: boarding finishes before the doors close`, () => {
    assert.ok("end" in boards[0] && boards[0].end <= T.doorClose1, `pickup board ends ${"end" in boards[0] && boards[0].end}`);
    assert.ok("end" in boards[1] && boards[1].end <= T.doorClose2, `coast board ends ${"end" in boards[1] && boards[1].end}`);
  });
  check(`traveler ${k}: exits only after the doors open`, () => {
    assert.ok(exits[0].start >= T.doorOpen2 + 0.5);
    assert.ok(exits[1].start >= T.doorOpen3 + 0.5);
  });
  check(`traveler ${k}: first board starts after the door opens`, () => {
    assert.ok(boards[0].start >= T.doorOpen1 + 0.6);
  });
  check(`traveler ${k}: evaluation is finite across the whole story`, () => {
    const f = createFrame();
    for (let t = -1; t <= T.end + 1; t += 0.05) {
      evaluateTraveler(k, t, t * 1.3, f);
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.z) && Number.isFinite(f.heading), `NaN at t=${t}`);
      for (const v of f.pose) assert.ok(Number.isFinite(v), `pose NaN at t=${t}`);
    }
  });
});

check("travelers are spatially separated while dancing", () => {
  const frames = SCRIPTS.map(() => createFrame());
  const t = T.partyFull + 3;
  frames.forEach((f, k) => evaluateTraveler(k, t, 0, f));
  for (let a = 0; a < frames.length; a++)
    for (let b = a + 1; b < frames.length; b++) {
      const d = Math.hypot(frames[a].x - frames[b].x, frames[a].z - frames[b].z);
      assert.ok(d > 0.9, `${a} and ${b} only ${d.toFixed(2)} m apart`);
    }
});

const latest = Math.max(...SCRIPTS.map((s) => s.actions[s.actions.length - 1].start));
console.log(`last scheduled action at t=${latest.toFixed(2)} (timeline ends ${T.end})`);
if (failures) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("all choreography checks passed");
