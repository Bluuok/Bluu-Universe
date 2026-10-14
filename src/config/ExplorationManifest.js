// A continuous, flyable circuit around the retained studio. Coordinates in metres.
export const ExplorationTuning={expansion:2.4,worldBounds:{min:[-1500,-900,-1600],max:[1600,1100,1500]},skyRadius:5000,cameraFar:9000,rockSurface:{enabled:true}};
export const expandExplorationPosition=point=>point.map(value=>value*ExplorationTuning.expansion);
export const ExplorationBounds=ExplorationTuning.worldBounds;
const baseRoute=[
 {id:'cloud-gate',name:'云门',position:[-52,22,-43],radius:17},
 {id:'star-crown',name:'星冠',position:[-132,70,-142],radius:20},
 {id:'lee-reef',name:'背风礁',position:[33,39,-191],radius:20},
 {id:'gold-sail',name:'金帆',position:[171,-22,-74],radius:20},
 {id:'home-light',name:'归航灯',position:[121,-28,83],radius:20},
 {id:'studio',name:'暖光工作室',position:[-4,2,8.5],radius:8}
];
const baseRocks=[
 {id:'gate-west',p:[-65,20,-46],s:[6.3,5.1,5.6]},
 {id:'gate-east',p:[-39,28,-48],s:[4.6,7,4.2]},
 {id:'gate-crown',p:[-53,40,-48],s:[3.5,2.2,4]},
 {id:'crown-base',p:[-133,54,-143],s:[13,5.2,10]},
 {id:'crown-moon',p:[-151,66,-159],s:[3,4,2.8]},
 {id:'reef-long',p:[33,23,-194],s:[19,4.5,8]},
 {id:'reef-small',p:[55,34,-205],s:[5,6,4]},
 {id:'sail-keel',p:[178,-37,-79],s:[10,3.5,12]},
 {id:'sail-small',p:[155,-39,-65],s:[4,3,4]},
 {id:'beacon-base',p:[120,-43,83],s:[8,4.5,7]},
 {id:'beacon-moon',p:[140,-32,97],s:[4,5,4]}
];
const baseClouds=[
 {id:'gate-wake',p:[-49,21,-43],points:[[-30,-8,20],[-16,-3,10],[0,0,0],[17,7,-13],[27,3,-23]],width:3.8,depth:3.0},
 {id:'crown-flow',p:[-127,74,-141],points:[[-32,-8,20],[-18,0,9],[0,5,0],[20,1,-7],[37,-8,-17]],width:5.5,depth:4.4},
 {id:'rear-tide',p:[31,43,-189],points:[[-54,8,1],[-29,2,-9],[-6,-3,0],[20,0,9],[45,7,6]],width:5.2,depth:3.7},
 {id:'sail-current',p:[170,-18,-76],points:[[-25,-18,-33],[-9,-8,-14],[0,0,0],[13,10,16],[29,8,36]],width:5.6,depth:4.5},
 {id:'return-current',p:[117,-24,79],points:[[-35,-8,-24],[-16,0,-8],[0,3,0],[18,-3,9],[29,-8,26]],width:4.6,depth:3.9},
 {id:'home-ribbon',p:[39,6,40],points:[[-21,-5,-21],[-8,0,-8],[5,6,3],[25,5,16],[40,-2,24]],width:2.5,depth:2.1},
 // Sparse linked currents make the next region visible across the long legs.
 {id:'gate-to-crown',link:true,p:[-94,49,-95],points:[[36,-22,37],[22,-12,20],[0,0,0],[-22,13,-27],[-30,18,-35]],width:1.8,depth:1.5},
 {id:'crown-to-reef',link:true,p:[-50,65,-175],points:[[-66,4,24],[-40,13,4],[-12,4,-8],[20,-11,-12],[60,-24,-10]],width:2.2,depth:1.7},
 {id:'reef-to-sail',link:true,p:[108,9,-135],points:[[-60,26,-47],[-34,22,-34],[-2,10,-4],[23,-10,20],[40,-25,38]],width:2.0,depth:1.6}
];
// Extend the whole circuit together; the studio and its arrival radius stay put.
export const ExplorationRoute=baseRoute.map(point=>({...point,position:point.id==='studio'?[...point.position]:expandExplorationPosition(point.position)}));
export const ExplorationRocks=baseRocks.map(rock=>({...rock,p:expandExplorationPosition(rock.p),s:[...rock.s]}));
export const ExplorationClouds=baseClouds.map(cloud=>({...cloud,p:expandExplorationPosition(cloud.p),points:cloud.points.map(expandExplorationPosition),width:cloud.width*Math.sqrt(ExplorationTuning.expansion),depth:cloud.depth*Math.sqrt(ExplorationTuning.expansion)}));
