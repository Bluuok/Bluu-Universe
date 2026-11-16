import assert from 'node:assert/strict';
import { Object3D, Vector3 } from 'three';
import { SpaceCollision } from '../src/core/SpaceCollision.js';
import { CollisionManifest as manifest } from '../src/config/CollisionManifest.js';
import { attributeStaticContact } from './static-contact-attribution.mjs';

// Detached feasibility checks only: browser input and full-world play remain separate.
const robot = new Object3D();
const world = new SpaceCollision({ ...manifest, dynamic: manifest.dynamic.filter(p => p.anchor === 'robot') }, { anchors: { robot } });
const routes = [
  { name: 'robot', start: [-2.8, 1.65, 10], delta: [0, 0, -.06] },
  { name: 'diagonal-wall', start: [-9, 3, 2], delta: [.06 / Math.SQRT2, 0, -.06 / Math.SQRT2], ids: ['studio-wall-left'] },
  { name: 'planter', start: [3.1, 3, 6.15], delta: [0, -.06, 0], ids: ['terrace-planter-right-pot', 'terrace-planter-right-leaves'] },
];
let cases = 0;
try {
  for (const [height, yaw] of [[2.01, .30], [2.15, .38], [2.29, .46]]) {
    robot.position.set(-2.8, height, 5.4);
    robot.rotation.y = yaw;
    for (const route of routes) for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
      const position = new Vector3(...route.start).add(new Vector3(dx, dy, dz).multiplyScalar(.25));
      const delta = new Vector3(...route.delta);
      let contact;
      for (let step = 0; step < 160; step++) {
        const result = world.resolve(position, delta, delta.clone().multiplyScalar(60), { dt: 1 / 60 });
        if (result.contacts.length) { contact = result; break; }
      }
      const label = `${route.name}: ${height}/${yaw}, offset ${dx},${dy},${dz}`;
      assert.ok(contact, `Missing contact: ${label}`);
      if (route.ids) {
        assert.ok(attributeStaticContact(contact, route.ids).matched, `Wrong first collider: ${label}`);
        const wrongIds = route.name === 'planter' ? ['studio-wall-left'] : ['terrace-planter-right-pot', 'terrace-planter-right-leaves'];
        assert.equal(attributeStaticContact(contact, wrongIds).matched, false, `False attribution: ${label}`);
      } else {
        assert.ok(contact.contacts.every(c => c.collider === 'robot'), `Wrong dynamic collider: ${label}`);
      }
      if (route.name === 'diagonal-wall') {
        assert.ok(contact.end[2] < contact.start[2], `Wall prevents tangential slide: ${label}`);
      }
      cases++;
    }
  }
  assert.equal(cases, 243);
  console.log(`PASS ${cases} detached prop/diagonal approach cases; no browser or gameplay acceptance.`);
} finally {
  world.dispose();
}
