// Canonical world coordinates, measured by decoding the original Draco GLBs
// and transforming every vertex into the Joan room's world space (scale 1).
// Architecture occupies one scene in both SPACE and ROOM; there is no second
// scaled room or differently positioned terrace behind the entry transition.
export const BuildingLayout = {
  source: {
    repository: 'https://github.com/jrefusta/joan-portfolio',
    models: ['room.glb', 'room2.glb', 'room3.glb'],
    measurement: 'Decoded Draco vertices and axis-aligned triangle surfaces',
    units: 'Original GLB units, scale 1',
  },
  floor: {
    min: [-5.0846, -0.2522, -4.6747],
    max: [4.0164, 0.0217, 4.4259],
    bounds: { min: [-5.0846, -0.2522, -4.6747], max: [4.0164, 0.0217, 4.4259] },
    top: 0.021,
  },
  walls: {
    back: { inner: -4.6746, outer: -4.9344, axis: 'z', top: 6.2484 },
    right: { inner: 4.0164, outer: 4.2763, axis: 'x', top: 6.2484 },
    left: { inner: -5.0846, outer: -5.3446, axis: 'x', top: 6.2484 },
    front: { inner: 4.4259, outer: 4.6859, axis: 'z', top: 6.2484 },
    thickness: 0.26,
  },
  shell: {
    min: [-5.3446, 0.021, -4.9344],
    max: [4.2763, 6.2484, 4.6859],
    center: [-0.53415, 3.1347, -0.12425],
  },
  rightWindow: {
    axis: 'x',
    innerPlane: 4.0164,
    outerPlane: 4.2763,
    min: [4.0164, 2.2449, -1.8549],
    max: [4.2763, 5.3043, 0.3708],
    center: [4.14635, 3.7746, -0.74205],
    width: 2.2257,
    height: 3.0594,
  },
  frontWindow: {
    // A real, tall facade opening exposes the retained room from outside.
    // Keep the original furniture, door and building anchors in place.
    center: [-2.35, 3.55, 4.5559],
    width: 4.40,
    height: 4.45,
    radius: 0.22,
  },
  door: {
    center: [1.35, 1.696, 4.5559],
    width: 1.75,
    height: 3.35,
    bottom: 0.021,
    innerPlane: 4.4259,
    outerPlane: 4.6859,
    openingMinX: 0.475,
    openingMaxX: 2.225,
  },
  terrace: {
    min: [-5.3446, -0.48, 4.4259],
    max: [4.2763, 0.021, 7.2459],
    top: 0.021,
    railHeight: 0.90,
    entryGap: [0.20, 2.50],
  },
  passage: {
    captureAhead:3.5,halfWidth:1.05,minY:.65,maxY:2.55,rearmMargin:1.1,
    approachDuration:.62,revealDuration:1.15,exitDuration:1.35,
    exitYaw:Math.PI,exitOffset:[0,0,1.2],exitSpeed:12,exitCameraClearance:.7,
  },
  anchors: {
    entry: [1.35, 1.15, 4.5559],
    docking: [1.35, 1.15, 6.05],
    doorCamera: [3.60, 3.10, 9.80],
    thresholdCamera: [1.35, 2.0, 4.94],
    entryTarget: [1.35, 2.0, 3.40],
    roomOverview: { position: [-16, 10, 8], target: [-.5, 2.3, 1] },
  },
  views: {
    externalFront: { position: [12, 9, 18], target: [-3.8, 2.8, 1.0] },
    roomTerrace: { position: [-14, 11, 18], target: [-0.53, 2.0, 1.8] },
    insideFacingDoor: { position: [-0.25, 3.65, -2.0], target: [1.35, 1.7, 5.90] },
  },
};

export default BuildingLayout;
