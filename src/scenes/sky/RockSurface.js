import * as THREE from 'three';

// Visual and collision owners build the same deterministic rock surface.
export function createRockGeometry(seed=1,surface=true){
  const g=new THREE.IcosahedronGeometry(1,2),a=g.attributes.position;
  if(surface)return warpRockGeometry(g,seed);
  for(let j=0;j<a.count;j++){const x=a.getX(j),y=a.getY(j),z=a.getZ(j),d=.96+.04*Math.sin(x*5.7+y*3.1+z*6.4);a.setXYZ(j,x*d,y*d,z*d);}
  g.computeVertexNormals();return g;
}
export function warpRockGeometry(geometry, seed = 1) {
  const positions = geometry.attributes.position;
  const point = new THREE.Vector3();
  let maximum = 0;
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).normalize();
    let warp = 0, amplitude = .30, frequency = 2.5;
    for (let octave = 0; octave < 4; octave++) {
      const value = Math.sin(point.x * frequency * 127.1 + point.y * frequency * 311.7
        + point.z * frequency * 74.7 + seed * 17.31) * 43758.5453;
      warp += (value - Math.floor(value)) * amplitude;
      amplitude *= .5;
      frequency *= 2.1;
    }
    const radius = 1 + (warp - .3) * .6;
    maximum = Math.max(maximum, radius);
    positions.setXYZ(i, point.x * radius, point.y * radius, point.z * radius);
  }
  // Radial normalization keeps every triangle inside the original unit sphere.
  geometry.scale(1 / maximum, 1 / maximum, 1 / maximum);
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Seat the whole crystal base below the authored mesh, only during construction.
export function seatRockCrystal(rock, crystal) {
  rock.updateMatrixWorld(true);
  crystal.position.x=rock.position.x+THREE.MathUtils.clamp(crystal.position.x-rock.position.x,-rock.scale.x*.3,rock.scale.x*.3);
  const positions=crystal.geometry.attributes.position;
  crystal.geometry.computeBoundingBox();
  const base=crystal.geometry.boundingBox.min.y;
  const ray=new THREE.Raycaster(),offset=new THREE.Vector3();
  const origin=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);
  let centerY=crystal.position.y;
  for(let i=0;i<positions.count;i++){
    if(Math.abs(positions.getY(i)-base)>.00001)continue;
    offset.fromBufferAttribute(positions,i).applyQuaternion(crystal.quaternion);
    origin.set(crystal.position.x+offset.x,rock.position.y+rock.scale.y+10,crystal.position.z+offset.z);
    ray.set(origin,down);
    const hit=ray.intersectObject(rock,false)[0];
    if(hit)centerY=Math.min(centerY,hit.point.y-offset.y-.08);
  }
  crystal.position.y=centerY;
  return crystal;
}

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function valueNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y) {
  let value = 0, amplitude = 1, frequency = 1, maximum = 0;
  for (let octave = 0; octave < 5; octave++) {
    value += valueNoise(x * frequency, y * frequency) * amplitude;
    maximum += amplitude;
    amplitude *= .6;
    frequency *= 2.2;
  }
  return value / maximum;
}

export function makeRockBumpTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, px = u * 8, py = v * 8;
    // Blend opposite noise edges so the sphere's UV seam has no height jump.
    const top = THREE.MathUtils.lerp(fbm(px, py), fbm(px - 8, py), u);
    const bottom = THREE.MathUtils.lerp(fbm(px, py - 8), fbm(px - 8, py - 8), u);
    const value = Math.round(255 * THREE.MathUtils.lerp(top, bottom, v));
    const offset = (x + y * size) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
