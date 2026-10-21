export const PaintFlowManifest = {
  enabled:true, seed:5314,
  budget:{strokes:240,triangles:115000,drawCalls:3},
  geometry:{curveSegments:10,crossSegments:14},
  layerDepth:1.3,
  surface:{strokeStrength:.36,relief:.0018,paintScale:.16,globalUV:true},
  blend:{resolution:96,smoothness:.22,profile:{width:1.18,depth:.65,axial:1.70,exponent:3.4},pigment:{width:1.25,strength:.94,smoothing:2}},
  motion:{amplitude:.18,rate:.22},
  clearance:4.5,
  palette:{blue:['#244c8d','#3168a7','#417eaf'],crest:'#91adbb',shadow:'#122b54',gold:'#bd9855',goldCrest:'#dec28a',goldShadow:'#665133',goldFraction:.10},
  paths:[
    {id:'main-flow',enabled:false,kind:'vortex',band:'main',group:0,count:39,lanes:3,width:[.84,1.24],depth:[.32,.48],length:1.48,laneSpacing:2.2,surface:5.4,phase:.1},
    {id:'upper-return',blend:true,kind:'curl',group:1,position:[-112,-22,-111],rotation:[.20,-.25,-.40],radius:[25,8.5],turns:.72,phase:2.3,flatten:.74,depthWave:10,depthCycles:1,depthDrift:18,laneRanges:[[0,1],[.12,.48],[.50,.80]],strokeLength:[7,10],count:63,lanes:3,width:[.90,1.28],depth:[.56,.80],length:1.80,laneSpacing:2.0,surface:0},
    {id:'distant-eddy',blend:{resolution:128,maxTriangles:68000,smoothness:.26,profile:{width:1.18,depth:.90,axial:1.70,exponent:3.4}},kind:'curl',group:2,position:[-25,-30,-178],rotation:[.35,.65,.15],radius:[16,7.5],turns:1.20,phase:-.65,flatten:.85,depthWave:7,laneRanges:[[0,1],[.16,.52],[.50,.88]],strokeLength:[11,12],count:39,lanes:3,width:[.80,1.18],depth:[.50,.72],length:1.75,laneSpacing:1.8,surface:0},
    {id:'broad-s-current',kind:'path',group:1,points:[[-139,-17,-124],[-116,-9,-109],[-81,-26,-83],[-42,-23,-68],[-10,-7,-108],[-15,-19,-155],[-40,-38,-186]],phase:1.7,sweep:{segmentLength:.8,crossSegments:32,profile:{width:[1.8,3.1],depth:[.50,.82],sectionPower:.78,ridgeStrength:.09,ridgeFlow:.70,endSize:.16,edgeBreakup:.065,bulges:[{at:.24,spread:.11,width:.35,depth:.10},{at:.43,spread:.065,width:-.42,depth:-.08},{at:.69,spread:.13,width:.25,depth:.18},{at:.84,spread:.075,width:-.30,depth:-.05}]},pigment:[{start:.16,end:.29,across:-.15,width:.38},{start:.52,end:.66,across:.18,width:.30},{start:.82,end:.91,across:-.05,width:.32}]}},
  ],
};
