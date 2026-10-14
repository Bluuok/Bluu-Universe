import {FlightTuning} from './FlightTuning.js';
import {BuildingLayout} from './BuildingLayout.js';
import {VortexManifest} from './VortexManifest.js';
import {ExplorationBounds,ExplorationTuning} from './ExplorationManifest.js';
import {WordFieldManifest} from './WordFieldManifest.js';
export const AssetManifest = {
  character: { url:'/assets/character/astronaut.glb', format:'glb', scale:1, height:1.55, rotation:[0,Math.PI,0], position:[-5.5,2,8.5], material:{body:'#fff2df',accent:'#719fb4',visor:'#092e52',trim:'#e5a45d'}, source:'https://sketchfab.com/3d-models/cute-astronaut-816bd786fe8b4559a009de6a95582003', provisional:false },
  building: BuildingLayout,
  vortex: VortexManifest,
  room:{ base:'/assets/room/', starOrnament:{enabled:true,url:'/assets/room/props/star-ceramic.png',support:[-.82,2.8,-3.65],height:.68,yaw:-.35,alphaBase:.94657}, labelOffsets:{threadcove:[-40,-18],clawtide:[40,10],contributions:[0,0],contact:[0,22]}, interactables:{threadcove:'leftMonitor',clawtide:'rightMonitor',contributions:'whiteboard',contact:'contactCard'}, overview:BuildingLayout.anchors.roomOverview },
  sky: {
    center:[-.53,2,1],radius:ExplorationTuning.skyRadius,cameraFar:ExplorationTuning.cameraFar,seed:2809,
    flybys:{enabled:true,seed:4901},
    wordField:WordFieldManifest,
    panorama:{url:'/assets/sky/world/blue-gold-panorama-v07-6k.png',intensity:.32,longitude:.16},
    brushes:{coarse:14000,fine:180000,radius:ExplorationTuning.skyRadius,seed:3203,coarseSize:[22,48,5,12].map(v=>v*ExplorationTuning.skyRadius/950),fineSize:[5,15,1.4,4.5].map(v=>v*ExplorationTuning.skyRadius/950)},
    pigment:{url:'/assets/sky/candidates/layer-夜空.png'},
    dust:{count:24750,strength:1},
    spiralCluster:{enabled:true,index:0,seed:'starhaven-gold-arm',normal:[.48,-.26,.84],arms:2,twist:1.5,armSpread:.12},
    stars:{distant:2600,nearby:130,clusters:480}
  },
  space:{ flight:FlightTuning.movement,bounds:ExplorationBounds,rockSurface:ExplorationTuning.rockSurface, door:BuildingLayout.door.center, docking:BuildingLayout.anchors.docking,
    cameraFocusOffset:[-1.4,0,0],facade:{minX:BuildingLayout.floor.min[0]-.3,maxX:BuildingLayout.floor.max[0]+.3,frontZ:BuildingLayout.walls.front.outer+.35} }
};
