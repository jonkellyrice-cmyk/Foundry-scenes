import assert from "node:assert/strict";
import { applyBattlefieldDynamicsMovement, adjustBattlefieldDynamicsMovement,
  readBattlefieldDynamicsMovementLedger } from "./battlefield-dynamics-movement-ledger.mjs";

const scene = { id: "scene", flags: {} };
const empty = readBattlefieldDynamicsMovementLedger(scene);
const move = { id: "movement-1", passed: { cost: 7.5, waypoints: [{ x: 0, y: 0 }, { x: 60, y: 0 }] } };
const first = applyBattlefieldDynamicsMovement(empty, "token", move);
assert.equal(first.changed, true);
assert.equal(first.ledger.tokens.token.spent, 7.5);
assert.equal(applyBattlefieldDynamicsMovement(first.ledger, "token", move).changed, false);
assert.equal(applyBattlefieldDynamicsMovement(first.ledger, "token", { ...move, id: "preview", passed: { waypoints: [] } }).changed, false);
const adjusted = adjustBattlefieldDynamicsMovement(first.ledger, "token", 3);
assert.equal(first.ledger.tokens.token.spent, 7.5);
assert.equal(adjusted.tokens.token.spent, 3);
assert.equal(applyBattlefieldDynamicsMovement(adjusted, "token", { ...move, id: "movement-2" }).ledger.tokens.token.spent, 10.5);
const cumulative = applyBattlefieldDynamicsMovement(first.ledger, "token", { ...move,
  passed: { cost: 12.5, waypoints: [...move.passed.waypoints, { x: 120, y: 0 }] } });
assert.equal(cumulative.cost, 5, "a cumulative checkpoint adds only the measured delta");
assert.equal(cumulative.ledger.tokens.token.spent, 12.5);
assert.equal(applyBattlefieldDynamicsMovement(cumulative.ledger, "token", move).reason, "ambiguous-checkpoint");
const continuation = applyBattlefieldDynamicsMovement(first.ledger, "token", { ...move,
  passed: { cost: 5, waypoints: [{ x: 60, y: 0 }, { x: 120, y: 0 }] } });
assert.equal(continuation.ledger.tokens.token.spent, 12.5);
assert.equal(applyBattlefieldDynamicsMovement(continuation.ledger, "token", { ...move,
  passed: { cost: 5, waypoints: [{ x: 60, y: 0 }, { x: 120, y: 0 }] } }).reason, "duplicate");
assert.equal(applyBattlefieldDynamicsMovement(first.ledger, "token", { ...move,
  passed: { cost: 20, waypoints: [{ x: 0, y: 0 }, { x: 60, y: 0 }] } }).reason, "ambiguous-checkpoint");
assert.equal(applyBattlefieldDynamicsMovement(first.ledger, "token", { ...move,
  passed: { cost: 5, waypoints: [{ x: 400, y: 0 }, { x: 500, y: 0 }] } }).reason, "ambiguous-checkpoint");
scene.flags["orphaned-sun-scenes"] = { battlefieldDynamicsMovementLedger: adjusted };
assert.equal(readBattlefieldDynamicsMovementLedger(scene).tokens.token.spent, 3);
const restored = readBattlefieldDynamicsMovementLedger({ ...scene,
  flags: { "orphaned-sun-scenes": { battlefieldDynamicsMovementLedger: first.ledger } } });
assert.equal(applyBattlefieldDynamicsMovement(restored, "token", move).reason, "duplicate");
assert.throws(() => adjustBattlefieldDynamicsMovement(adjusted, "token", -1));
assert.throws(() => readBattlefieldDynamicsMovementLedger({ ...scene, id: "other" }));
console.log("battlefield dynamics movement ledger tests passed");
