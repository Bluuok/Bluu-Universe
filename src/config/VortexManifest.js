// One representative world-fixed form. Visual geometry, materials, solid core
// proxy and traversal landmarks are explicit data; cloud bands are permeable.
export const VortexManifest = {
  id:'azure-whorl', position:[-26,-4,-42], rotation:[.04,.47,-.08],
  geometry:{curveSegments:240,crossSegments:32},
  cloud:{axialPower:4,shadingSegments:4,density:.90,shadowStrength:2.4,crestBlend:.30,color:'#3375ac',crest:'#abc7cf',shadow:'#143969',opacity:.96,strokeScale:1,strokeStrength:.66,relief:.0018,paintAccent:'#c3d2cf',paintShadow:'#154675',paintLight:'#c9b582',emissiveIntensity:.48,edgeBreakup:.22,
    innerRadius:6,outerRadius:18,turns:.85,phase:.3,width:[2.2,4.9],depth:[1.6,3.0],
    depthPath:[[0,-6],[.2,-3],[.42,8],[.63,10],[.82,3],[1,-6]],
    bulges:[{at:.3,spread:.10,width:1.0,depth:3.6},{at:.68,spread:.12,width:1.2,depth:3.1}]},
  wing:{axialPower:4,shadingSegments:4,density:.90,shadowStrength:2.4,crestBlend:.30,color:'#528caf',crest:'#b3d2df',shadow:'#234a75',opacity:.94,strokeScale:.86,strokeStrength:.62,relief:.0016,paintAccent:'#c5d0c4',paintShadow:'#215b8b',paintLight:'#c5ba8b',emissiveIntensity:.50,edgeBreakup:.26,
    innerRadius:13,outerRadius:22,turns:.42,phase:2.8,width:[1.7,3.7],depth:[1.7,3.2],
    path:[[-7.214,9.165,-11.574],[-2.856,4.302,-14.945],[1.687,-3.554,-18.208],[9.064,-7.052,-16.677],[13.675,-2.553,-10.977],[11.798,5.517,-6.355],[1.691,7.241,.117]],
    depthPath:[[0,-11],[.5,-8],[1,-6]],
    bulges:[{at:.52,spread:.13,width:.7,depth:2.5}]},
  core:{anchor:'vortexCore',position:[4,2,2.4],radius:2.4,collisionRadius:2.55,
    color:'#ecd08b',emissive:'#e5b75d',emissiveIntensity:.44,paintScale:8,strokeScale:1.15,strokeStrength:.62,relief:.0028,paintAccent:'#f3d994',paintShadow:'#b49a62',paintLight:'#f8dfa0'},
  halo:{halo:true,color:'#ead7a3',crest:'#fff0bf',shadow:'#b79c64',emissive:'#edbe65',emissiveIntensity:.60,opacity:.24,strokeScale:1.15,strokeStrength:.30,relief:.0007,paintAccent:'#fff0c2'},
  // Local landmarks are a convenient design/read-only test map, never a
  // product teleport/control API. The corridor runs through the open centre.
  passage:{front:[0,-1,8],middle:[0,-1,0],back:[0,-1,-8]},
};
