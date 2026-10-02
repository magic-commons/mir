/* timeline-interaction.node.mjs — BASINS tools/test-timeline-interaction.mjs, ported (2026-10-02); the dock checks run
 * against the kit's dockGeometry through a four-line adapter. */
import assert from 'node:assert/strict';
import {createTimelineModel} from '../mir/timeline/model.js';
import {moveTimelinePoints,removeTimelinePoints} from '../mir/timeline/source.js';
import {dockGeometry} from '../mir/window/dock.js';
/* BASINS' timelineDockGeometry (app/timeline-dock.js) is the kit's dockGeometry (mir/window/dock.js): the same law, read through this adapter */
const timelineDockGeometry=(o)=>{const g=dockGeometry({...o,viewport:{width:o.vw,height:o.vh}});return g&&{x:g.left,y:g.top,w:g.width,h:g.height,side:g.side};};
import {clipsInRectangle,pointsInRectangle,selectionRect} from '../mir/timeline/selection.js';
import {createTimelinePlayhead} from '../mir/timeline/playhead.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const source={length:8,points:[{t:0,v:.1,tension:.3,segment:'hold'},{t:.25,v:.4,tension:-.7},{t:.5,v:.8,tension:.8},{t:.75,v:.6,tension:0},{t:1,v:.9,tension:0}]};
const group=moveTimelinePoints(source,[1,2],8,1);
assert.deepEqual(group.points.map(p=>p.t*group.length),[0,4,6,6,8]);
near(group.points[1].v,.6);near(group.points[2].v,1);
assert.equal(group.points[0].segment,'hold');assert.equal(group.points[1].tension,-.7);
const left=moveTimelinePoints(source,[1,2],-20,-20);assert.deepEqual(left.points.map(p=>p.t*left.length),[0,0,2,6,8]);near(left.points[2].v,.4);
const slide=moveTimelinePoints(source,[1,2],3,.1,{slide:true});assert.deepEqual(slide.points.map(p=>p.t*slide.length),[0,5,7,9,11]);near(slide.points[3].v,.6);assert.equal(slide.length,11);
assert.equal(removeTimelinePoints(source,[0,1,2,3]).removed,false);assert.equal(removeTimelinePoints(source,[1,2]).points.length,3);
assert.equal(moveTimelinePoints(source,[99],1,1).invalid,true);

const m=createTimelineModel(),a=m.create({targetId:'camera.rotation',start:2,duration:8,value:.2}),b=m.create({targetId:'camera.panX',start:6,duration:4,value:.5,laneId:'lane3'});
m.updateCurve(m.state().clips[0].curveId,{points:source.points,name:'ORBIT',color:'#be9bdd',min:.1,max:.8});
m.updateClip(a,{duration:6,offset:1,scale:2,mute:true});const legacy=m.duplicate(a);
const before=m.serialize();let changes=0;const off=m.subscribe(()=>changes++);
const ids=m.duplicateClips([a,b,legacy]);assert.equal(ids.length,3);assert.equal(changes,1);
let d=m.state(),copies=ids.map(id=>d.clips.find(c=>c.id===id));assert.equal(new Set(copies.map(c=>c.curveId)).size,3);
assert.equal(copies[0].start,14);assert.equal(copies[1].start,18);
for(const [i,original]of [a,b,legacy].entries()){
  const c=before.clips.find(c=>c.id===original),copy=copies[i],originalCurve=before.curves.find(x=>x.id===c.curveId),copyCurve=d.curves.find(x=>x.id===copy.curveId);
  assert.deepEqual({...copyCurve,id:originalCurve.id},originalCurve);
  assert.deepEqual({...copy,id:c.id,curveId:c.curveId,start:c.start},c);
}
m.updateCurve(copies[0].curveId,{name:'INDEPENDENT'});assert.equal(m.state().curves.find(c=>c.id===before.clips[0].curveId).name,'ORBIT');
m.undo();m.undo();assert.deepEqual(m.serialize(),before,'One undo removes all copied sources and clips');m.redo();
const start=m.serialize();m.begin();const held=m.state().clips.filter(c=>[a,b].includes(c.id));m.moveClips([a,b],{beatDelta:-99,laneDelta:99,originals:held});
d=m.state();assert.equal(d.clips.find(c=>c.id===a).start,0);assert.equal(d.clips.find(c=>c.id===b).start,4);assert.equal(d.clips.find(c=>c.id===b).laneId,'lane4');
m.moveClips([a,b],{beatDelta:3,laneDelta:0,originals:held});assert.equal(m.state().clips.find(c=>c.id===a).start,5);m.cancel();assert.deepEqual(m.serialize(),start);
const payload=m.copyClips([a,b]),sig=m.signature();assert.equal(m.pasteClips(payload,{start:0,laneId:'lane4'}),null);assert.equal(m.signature(),sig);
assert.equal(m.deleteClips([a,'absent']),false);assert.equal(m.signature(),sig);off();
// Preflight every independent source, including copies of linked originals.
const cap=createTimelineModel();const c=cap.create({targetId:'camera.rotation',value:.2}),snapshot=cap.serialize();
snapshot.curves=Array.from({length:1024},(_,i)=>({...snapshot.curves[0],id:'curve'+(100+i)}));snapshot.clips[0].curveId=snapshot.curves[0].id;cap.restore(snapshot);
const full=cap.signature();assert.equal(cap.duplicateClips([c]),null);assert.equal(cap.signature(),full);
const points=createTimelineModel(),pi=points.create({targetId:'camera.rotation',duration:8,value:.1}),pc=points.state().curves[0].id;points.updateCurve(pc,{points:source.points});const ps=points.serialize();points.begin();
points.movePoints(pc,[1,2],3,.1,{slide:true,original:ps.curves[0]});points.movePoints(pc,[1,2],1,.05,{slide:true,original:ps.curves[0]});points.commit();
assert.deepEqual(points.state().curves[0].points.map(p=>p.t*points.state().curves[0].length),[0,3,5,7,9]);assert.equal(points.state().curves[0].length,11,'Retreating group drag retains source runway');points.undo();assert.deepEqual(points.serialize(),ps);

const span={left:280,right:1640},sizes={vertical:{w:56,h:320},horizontal:{w:320,h:56}};
for(const side of ['left','right','top','bottom'])for(const dock of ['top','bottom']){
  const g=timelineDockGeometry({span,side,dock,height:440,vw:1920,vh:1080,railSizes:sizes});assert.equal(g.side,side);assert.ok(g.x>=span.left&&g.x+g.w<=span.right);assert.ok(g.y>=8&&g.y+g.h<=1072);
  if(side==='left')assert.equal(g.x,344);if(side==='right')assert.equal(g.x+g.w,1576);
  if(side==='top'&&dock==='top')assert.equal(g.y,72);if(side==='bottom'&&dock==='bottom')assert.equal(g.y+g.h,1008);
}
const fallback=timelineDockGeometry({span:{left:8,right:368},side:'left',dock:'bottom',height:440,vw:376,vh:700,railSizes:sizes});assert.equal(fallback.side,'top');assert.equal(fallback.w,360);
assert.equal(timelineDockGeometry({span:{left:150,right:300},side:'left',dock:'bottom',height:440,vw:376,vh:700,railSizes:sizes}),null);
const doc={lanes:[{id:'lane1'},{id:'lane2'}],clips:[{id:'a',laneId:'lane1',start:2,duration:4},{id:'b',laneId:'lane2',start:10,duration:4}]};
assert.deepEqual(clipsInRectangle(doc,selectionRect({x:120,y:62},{x:40,y:0}),20,48),['a']);
assert.deepEqual(pointsInRectangle({start:2,duration:4,offset:2,scale:1},source,{left:40,right:120,top:14,bottom:62},20,48,0),[1,2,3]);

// Presentation is bounded and responds to seeking, pause, reduced motion and
// hidden state; it owns no scheduler or project serialization.
let beat=1,time=1000,playing=true,hidden=false,scrubbing=false,reduced=false;
globalThis.matchMedia=()=>({get matches(){return reduced;}});const realPerformance=globalThis.performance;
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>time}});
const head={style:{},classList:{toggle(){}}},tail={style:{}},paint=createTimelinePlayhead({head,tail,clock:{beats:()=>beat,playing:()=>playing,bpm:()=>60},controller:{isScrubbing:()=>scrubbing},visible:()=>!hidden,pixels:()=>100,scroll:()=>20});
paint.paint();assert.equal(head.style.transform,'translateX(80px)');assert.equal(tail.style.width,'0px');
time+=20;beat+=.02;paint.paint();near(parseFloat(tail.style.width),16);
time+=20;beat+=100;paint.paint();assert.equal(tail.style.width,'0px');
time+=20;beat+=.02;scrubbing=true;paint.paint();assert.equal(tail.style.width,'0px');
scrubbing=false;reduced=true;time+=20;beat+=.02;paint.paint();assert.equal(tail.style.width,'0px');
reduced=false;playing=false;paint.paint();assert.equal(tail.style.width,'0px');hidden=true;head.style.transform='unchanged';paint.paint();assert.equal(head.style.transform,'unchanged');
Object.defineProperty(globalThis,'performance',{configurable:true,value:realPerformance});delete globalThis.matchMedia;
console.log('Timeline grouped edits/copies/undo, capacity rejection, dock sides, selection coordinates and bounded playhead pass.');
