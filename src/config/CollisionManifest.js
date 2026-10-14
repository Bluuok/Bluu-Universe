import { BuildingLayout } from './BuildingLayout.js';
import { VortexManifest } from './VortexManifest.js';
import { PlanetManifest } from './PlanetManifest.js';
import { ExplorationRocks, ExplorationTuning } from './ExplorationManifest.js';

// Collision proxies are authored separately from visual mesh names/materials.
// All positions are world coordinates, except primitives with an explicit
// anchor; their positions/rotations are local to that Object3D's world matrix.
// Box rotation uses radians in Three.js Euler XYZ order. size is full extent.
const box = (id, size, position, extra = {}) => ({ id, type: 'box', size, position, rotation: [0, 0, 0], ...extra });
const boundsBox = (id, min, max, extra = {}) => box(id,
  max.map((value, axis) => value - min[axis]),
  max.map((value, axis) => (value + min[axis]) / 2), extra);

export function createCollisionManifest(layout = BuildingLayout) {
  const { shell, walls, floor, door, terrace } = layout;
  const minX = walls.left.outer, maxX = walls.right.outer;
  const backZ = walls.back.outer, frontZ = walls.front.outer;
  const wallBottom = floor.min[1], wallTop = walls.front.top;
  const doorTop = door.bottom + door.height;
  const cx = (terrace.min[0] + terrace.max[0]) / 2;
  const cz = (terrace.min[2] + terrace.max[2]) / 2;
  const width = terrace.max[0] - terrace.min[0];
  const depth = terrace.max[2] - terrace.min[2];
  const staticPrimitives = [
    boundsBox('studio-floor', floor.min, floor.max),
    boundsBox('studio-wall-left', [walls.left.outer, wallBottom, backZ], [walls.left.inner, wallTop, frontZ]),
    boundsBox('studio-wall-right', [walls.right.inner, wallBottom, backZ], [walls.right.outer, wallTop, frontZ]),
    boundsBox('studio-wall-back', [minX, wallBottom, walls.back.outer], [maxX, wallTop, walls.back.inner]),
    // Retained glazing is solid. The front window and right window therefore
    // share their wall's collision volume; only the entrance is an opening.
    boundsBox('studio-wall-front-left', [minX, wallBottom, walls.front.inner], [door.openingMinX, wallTop, frontZ]),
    boundsBox('studio-wall-front-right', [door.openingMaxX, wallBottom, walls.front.inner], [maxX, wallTop, frontZ]),
    boundsBox('studio-wall-front-header', [door.openingMinX, doorTop, walls.front.inner], [door.openingMaxX, wallTop, frontZ]),
    // Original StudioBuilding vault profile, sampled as one closed proxy mesh.
    // The attic is filled down to the wall top; manual space flight never
    // enters the room, and confirmed docking uses its separate scripted path.
    { id: 'studio-roof', type: 'roof', centerXZ: [shell.center[0], shell.center[2]],
      width: shell.max[0] - shell.min[0] + .64,
      depth: shell.max[2] - shell.min[2] + .64,
      cornerRadius: .98, baseY: wallTop + .38, rise: .68,
      archPower: 1.35, hipBase: .83, hipFactor: .17,
      bottomY: wallTop - .004, radialSegments: 48, radialRings: 6 },
    // 38 visible planks become one continuous slab; tiny plank gaps cannot
    // catch the capsule. Its top stays at the measured shared floor height.
    box('terrace-deck', [width, .12, depth], [cx, floor.top - .06, cz]),
    box('terrace-deck-undertray', [width + .04, .06, depth + .05], [cx, -.17, cz]),
    box('terrace-foundation', [width + .10, .26, terrace.max[2] - shell.min[2] + .10],
      [cx, -.51, (terrace.max[2] + shell.min[2]) / 2]),
  ];

  // Retain the actual thin rails and posts instead of inventing a solid wall
  // above the deck; the central docking gap remains open.
  const railTop = terrace.top + terrace.railHeight;
  const sideStartZ = terrace.min[2] + .35, sideEndZ = terrace.max[2] - .14;
  for (const [side, x] of [['left', terrace.min[0] + .15], ['right', terrace.max[0] - .15]]) {
    staticPrimitives.push(
      box(`terrace-rail-${side}-top`, [.078, .078, sideEndZ - sideStartZ], [x, railTop, (sideStartZ + sideEndZ) / 2]),
      box(`terrace-rail-${side}-lower`, [.03, .03, sideEndZ - sideStartZ], [x, terrace.top + .37, (sideStartZ + sideEndZ) / 2]),
    );
    for (const [index, z] of [sideStartZ, cz, sideEndZ].entries()) {
      staticPrimitives.push(box(`terrace-rail-${side}-post-${index}`, [.07, terrace.railHeight, .07], [x, terrace.top + terrace.railHeight / 2, z]));
    }
  }
  for (const [side, start, end] of [
    ['left', terrace.min[0] + .15, terrace.entryGap[0]],
    ['right', terrace.entryGap[1], terrace.max[0] - .15],
  ]) {
    staticPrimitives.push(
      box(`terrace-rail-front-${side}-top`, [end - start, .078, .078], [(start + end) / 2, railTop, sideEndZ]),
      box(`terrace-rail-front-${side}-lower`, [end - start, .03, .03], [(start + end) / 2, terrace.top + .37, sideEndZ]),
    );
    for (const [index, x] of [start, (start + end) / 2, end].entries()) {
      staticPrimitives.push(box(`terrace-rail-front-${side}-post-${index}`, [.07, terrace.railHeight, .07], [x, terrace.top + terrace.railHeight / 2, sideEndZ]));
    }
  }

  const entryFrameY = floor.top + door.height / 2;
  for (const [side, x] of [['left', door.openingMinX - .062], ['right', door.openingMaxX + .062]]) {
    staticPrimitives.push(box(`studio-door-frame-${side}`, [.13, door.height + .13, .34], [x, entryFrameY + .018, door.center[2]]));
  }
  staticPrimitives.push(
    box('studio-door-frame-header', [door.width + .255, .13, .34], [door.center[0], floor.top + door.height + .048, door.center[2]]),
    box('studio-door-threshold', [door.width + .11, .029, .42], [door.center[0], floor.top + .015, door.center[2]]),
    box('terrace-bench-seat', [1.35, .12, .50], [-2.70, .53, 6.60]),
  );
  for (const [index, x] of [-3.18, -2.22].entries()) staticPrimitives.push(box(`terrace-bench-leg-${index}`, [.075, .49, .32], [x, .26, 6.60]));
  for (const [side, x, z, radius] of [['left', -4.50, 5.50, .63], ['right', 3.52, 6.32, .42]]) {
    // Convex proxies cover the planter and foliage envelope without following
    // individual decorative leaves. Replacing a prop only changes this data.
    staticPrimitives.push(
      box(`terrace-planter-${side}-pot`, [radius * 1.12, radius * .90, radius * 1.12], [x, terrace.top + radius * .45, z]),
      box(`terrace-planter-${side}-leaves`, [radius * 1.40, radius * 1.50, radius * 1.30], [x, terrace.top + radius * 1.27, z]),
    );
  }

  const closedDoor = [box('studio-closed-door', [door.width - .04, door.height - .03, .066],
    [door.center[0], floor.top + door.height / 2, walls.front.outer + .010], { enabledWhen: 'doorClosed' })];

  // The application binds anchor "robot" to SpaceScene.robot explicitly.
  // The invisible ray-picking target, stars, satellite rings and UI labels
  // never contribute triangles. Rotation/bobbing are read from that anchor.
  const dynamic = [
    {id:'sapphire-solid-planet',type:'sphere',radius:PlanetManifest.collisionRadius,position:[0,0,0],anchor:PlanetManifest.anchor},
    {id:'vortex-solid-core',type:'sphere',radius:VortexManifest.core.collisionRadius,position:[0,0,0],anchor:VortexManifest.core.anchor},
    box('robot-head', [.94, .72, .81], [0, .13, .04], { anchor: 'robot' }),
    box('robot-body', [.648, .60, .612], [0, -.37, 0], { anchor: 'robot' }),
    box('robot-base', [.50, .14, .50], [0, -.62, 0], { anchor: 'robot' }),
    box('robot-arm-left', [.39, .47, .33], [-.565, -.145, .065], { anchor: 'robot' }),
    box('robot-arm-right', [.39, .47, .33], [.565, -.145, .065], { anchor: 'robot' }),
    { id: 'robot-antenna-tip', type: 'sphere', radius: .055, position: [.15, .69, 0], anchor: 'robot' },
    // Explicit asteroid anchors follow their small authored hover motion.
    // Its continuous deformation stays within 1.07 times the source sphere.
    // Scale is baked into proxy geometry before the explicit unit-scale
    // SpaceScene.nearAsteroid anchor transform; never scale the capsule.
    { id: 'near-asteroid', type: 'sphere', radius: 1.07, scale: [2.05, 1.2, 1.68], position: [0, 0, 0], anchor: 'nearAsteroid' },
    box('near-asteroid-planter', [.50, .35, .50], [-.17, 1.087, .10], { anchor: 'nearAsteroid' }),
    box('near-asteroid-plant-leaves', [.85, .84, .85], [-.17, 1.70, .10], { anchor: 'nearAsteroid' }),
    { id: 'side-asteroid', type: 'sphere', radius: 1.07, scale: [1.48, .85, 1.2], position: [0, 0, 0], anchor: 'sideAsteroid' },
    box('side-asteroid-planter', [.315, .221, .315], [-.17, .756, .10], { anchor: 'sideAsteroid' }),
    box('side-asteroid-plant-leaves', [.536, .530, .536], [-.17, 1.142, .10], { anchor: 'sideAsteroid' }),
    { id: 'rear-asteroid', type: 'sphere', radius: 1.07, scale: [.93, .69, .92], position: [0, 0, 0], anchor: 'rearAsteroid' },
  ];

  // Both project satellites are reachable in the finite all-around space
  // bounds. Their solid hardware follows explicit group anchors. Decorative
  // orbit rings, plane text and transparent pick volumes stay non-solid.
  for (const [id, anchor] of [['threadcove', 'satelliteThreadcove'], ['clawtide', 'satelliteClawtide']]) {
    dynamic.push(
      box(`satellite-${id}-core`, [.75, .74, .93], [0, 0, .035], { anchor }),
      { id: `satellite-${id}-lens`, type: 'sphere', radius: .16, scale: [1, 1, .52], position: [0, .01, .51], anchor },
      box(`satellite-${id}-nameplate`, [1.62, .32, .048], [0, -.64, .25], { anchor }),
      box(`satellite-${id}-antenna`, [.042, .37, .042], [0, .515, 0], { anchor }),
      { id: `satellite-${id}-antenna-tip`, type: 'sphere', radius: .063, position: [0, .72, 0], anchor },
    );
    for (const [side, sign] of [['left', -1], ['right', 1]]) dynamic.push(
      box(`satellite-${id}-panel-${side}`, [1.0, .67, .12], [sign * 1.21, .02, .015], { anchor }),
      box(`satellite-${id}-arm-${side}`, [.42, .09, .09], [sign * .56, 0, 0], { anchor }),
    );
  }

  for(const [index,rock]of ExplorationRocks.entries())staticPrimitives.push({id:'circuit-'+rock.id,type:'rock',seed:index+1,surface:ExplorationTuning.rockSurface.enabled,scale:rock.s,position:rock.p});
  return {
    static: staticPrimitives, door: closedDoor, dynamic,
    capsule: {
      // Public character manifest overrides AssetManifest's initial 1.55.
      // 48 CPU float samples / 567840 skinned vertices at height 1.7 measured
      // max width 1.206397, depth 1.237176 and radial extent .632761. These
      // endpoints also cover the visual +/- .055 hover bob, for every yaw.
      // alpha.11 uses a short, wide flight envelope for the new leaning poses.
      // Confirmed docking uses its own narrow upright path probe below.
      radius: 1.00, segmentLength: .14, footOffsetY: -.18, skin: .012,
      height: 1.7, source: '/assets/character/manifest.json',
      // footOffsetY is capsule BOTTOM relative to CharacterScene.group feet.
      // Flight envelope spans -.192 .. 1.972 relative to feet. Manual
      // flight cannot enter the closed studio; docking is a separate mode.
    },
    dockingCapsule:{radius:.70,segmentLength:.84,footOffsetY:-.17,skin:.012,height:1.7},
  };
}

export const CollisionManifest = createCollisionManifest();
export default CollisionManifest;
