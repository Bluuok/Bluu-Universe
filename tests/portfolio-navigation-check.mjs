import assert from 'node:assert/strict';
import {getProjectNeighbours,projectCover} from '../src/core/PortfolioNavigation.js';

const entries={alpha:{name:'Alpha'},bravo:{name:'Bravo'},charlie:{name:'Charlie'},delta:{name:'Delta'}};
assert.deepEqual(getProjectNeighbours(entries,'alpha'),{
  current:'alpha',index:0,total:4,previous:'delta',next:'bravo',
});
assert.deepEqual(getProjectNeighbours(entries,'bravo'),{
  current:'bravo',index:1,total:4,previous:'alpha',next:'charlie',
});
assert.deepEqual(getProjectNeighbours(entries,'delta'),{
  current:'delta',index:3,total:4,previous:'charlie',next:'alpha',
});
assert.equal(getProjectNeighbours(entries,'absent'),null);
assert.equal(getProjectNeighbours({},'absent'),null);
assert.deepEqual(getProjectNeighbours({only:{}},'only'),{
  current:'only',index:0,total:1,previous:'only',next:'only',
});
assert.equal(projectCover({media:[{src:'/assets/projects/real-work.webp'}]}),'/assets/projects/real-work.webp');
assert.equal(projectCover({image:'/assets/projects/screen.png'}),'/assets/projects/screen.png');
assert.equal(projectCover({media:[{src:'https://evil.example/track.png'}],image:'/assets/projects/backup.jpg'}),'/assets/projects/backup.jpg');
assert.equal(projectCover({image:'javascript:alert(1)'}),null);
assert.equal(projectCover({image:'/assets/projects/../../sensitive.png'}),null);
assert.equal(projectCover({media:[],image:null}),null);
console.log('Portfolio project adjacency, small registries and local preview validation OK');
