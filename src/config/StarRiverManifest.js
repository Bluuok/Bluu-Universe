// Two reachable, differently shaped currents. They are permeable paint clouds,
// not walls, duplicated spirals or scenery attached to the player's camera.
export const StarRiverManifest = [
  {id:'upper-rear-current',position:[-27,24,12],rotation:[.30,.20,-.45],
    points:[[-20,-7,-7],[-13,1,-4],[-5,5,2],[6,3,6],[16,0,3]],
    paint:{crestBlend:.30,color:'#3c8aba',crest:'#b7d6d2',shadow:'#18538c',paintShadow:'#1b5586',paintLight:'#dbc18c',
      width:[.3,2.4],depth:[.4,2.3],opacity:.96,strokeScale:1.1,strokeStrength:.56,relief:.0015,edgeBreakup:.28,
      emissiveIntensity:.85,paintAccent:'#bcccd0',bulges:[{at:.32,spread:.13,width:1.2,depth:.9}]}},
  {id:'lower-east-current',position:[10,-20,-19],rotation:[-.3,.2,.35],
    points:[[-16,0,3],[-6,4,-2],[3,1,-5],[12,-1,0]],
    paint:{crestBlend:.30,color:'#448fb6',crest:'#bad2ca',shadow:'#245586',paintShadow:'#225682',paintLight:'#e0bd7f',
      width:[.25,2.1],depth:[.35,2.05],opacity:.95,strokeScale:1.2,strokeStrength:.54,relief:.0014,edgeBreakup:.27,
      emissiveIntensity:.80,paintAccent:'#d4c59f',bulges:[{at:.6,spread:.16,width:.8,depth:.7}]}},
];
