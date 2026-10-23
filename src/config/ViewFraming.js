// Camera-only limits around the retained world-space studio.
// StudioBuilding's CPU Box3: [-5.6646,-.6384,-5.2544]..[4.5963,7.8054,7.2959].
export const ViewFraming = {
  spaceBounds: { min: [-5.75, -0.70, -5.34], max: [4.68, 7.90, 7.38] },
  roomBounds: { min: [-5.75, -0.70, -5.34], max: [4.68, 6.50, 7.38] },
  // Relative to the feet; includes the helmet, float and pose range.
  characterExtents: { min: [-1.02, -0.20, -1.02], max: [1.02, 1.98, 1.02] },
  orbitLimits: { yaw: [-Math.PI, Math.PI], pitch: [-1.38, 1.38], continuousYaw: true },
  desktopSpace: { left: 0.30, right: 0.97, top: 0.18, bottom: 0.82 },
  desktopFlight: { left: 0.12, right: 0.92, top: 0.16, bottom: 0.82 },
  flight: { distance: 8.5, focusHeight: 1.02, studioDistance: 15, studioRange: [3,12] },
  // Authored satellite directions stay outside the studio shell. The final
  // view is fitted against the actual project panel rectangle.
  satelliteProjectOffsets: { threadcove: [-9.2, 3.4, 5.2], clawtide: [3.1, 1.8, 6.4] },
  roomMargins: { left: 24, right: 24, top: 92, bottom: 96 },
};
export default ViewFraming;

