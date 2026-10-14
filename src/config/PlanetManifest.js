// One reachable landmark behind/right of the studio. Unit-scale world anchor;
// visual components remain separate from the solid proxy in CollisionManifest.
export const PlanetManifest = {
  id:'sapphire-gold', anchor:'sapphirePlanet', position:[18,12,21],
  radius:4.8, collisionRadius:4.96,
  ring:{innerRadius:6.6,outerRadius:14.2,tilt:[24.5,0,7.5]},
  rotationSpeed:.036, ringRotationSpeed:.0162, flowSpeed:1,
  // Illuminate the studio-facing approach; keep the far hemisphere in night.
  lightDirection:[-Math.SQRT1_2,.28,-Math.SQRT1_2],
  palette:{deepBlue:'#020b22',sapphireBlue:'#0a3b8c',lightBlue:'#2877e0',
    goldCore:'#ffe89e',goldEdge:'#d49b29',fresnel:'#3582ff',
    atmosphere:'#195bde',sunHalo:'#84b7ff',ringCore:'#fde4a3',ringEdge:'#bf8d3b',ringIndigo:'#274378'},
};
