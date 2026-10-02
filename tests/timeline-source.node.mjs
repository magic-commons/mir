import assert from 'node:assert/strict';
import { createTimelineModel, TIMELINE_HISTORY_BYTES, TIMELINE_HISTORY_LIMIT } from '../mir/timeline/model.js';
import { addTimelinePoint, moveTimelinePoint, evaluateTimelineSource, normalizeTimelinePoints, TIMELINE_MAX_SOURCE_POINTS, TIMELINE_MAX_TOTAL_POINTS } from '../mir/timeline/source.js';
import { evaluate } from '../mir/modulation/curve.js';

const near = (a,b) => assert.ok(Math.abs(a-b)<1e-12, `${a} != ${b}`);
const source = { length: 4, points: [{ t:0,v:.1,tension:.5 },{ t:.5,v:.8,tension:-.4 },{ t:1,v:.3,tension:0 }] };
const extended = addTimelinePoint(source, 12, .9);
assert.equal(extended.length,12); assert.equal(extended.index,3);
assert.deepEqual(extended.points.map(p=>p.t*extended.length),[0,2,4,12]);
for (let beat=0;beat<=4;beat+=.125) near(evaluateTimelineSource(source,beat),evaluateTimelineSource(extended.source,beat));
assert.deepEqual(source.points.map(p=>p.t),[0,.5,1]);
// Timeline endpoints are editable musical times, rather than pinned LFO phases.
const last = moveTimelinePoint(source,2,9,.2);
assert.equal(last.length,9);assert.equal(last.points[last.index].t*last.length,9);
near(last.points[1].t*last.length,2);
const first = moveTimelinePoint(source,0,1,.4);
assert.equal(first.points[first.index].t*first.length,1);
assert.equal(evaluateTimelineSource(first.source,0),.4);
const across = moveTimelinePoint(source,1,6,.7);
assert.equal(across.index,2); assert.equal(across.points[2].v,.7);
// Stable duplicate ordering returns the newly added node, not an identical predecessor.
const duplicate = addTimelinePoint(source,2,.8);
assert.equal(duplicate.index,2);assert.equal(duplicate.points.length,4);
// Preserve legacy mathematical reads at duplicate times, including the old first-time exception.
const jumps = { length:4,points:[{t:0,v:.1,tension:0},{t:0,v:.2,tension:0},{t:.5,v:.3,tension:0},{t:.5,v:.8,tension:0},{t:1,v:.4,tension:0}] };
for (const beat of [0,.001,1,2,2.001,3,4,5]) assert.equal(evaluateTimelineSource(jumps,beat),evaluate(jumps.points,beat/4));
assert.equal(evaluateTimelineSource(jumps,NaN),evaluate(jumps.points,0));

const model=createTimelineModel(),id=model.create({targetId:'camera.rotation',value:.2});
let saved=model.serialize(),curveId=saved.clips[0].curveId;
model.updateCurve(curveId,{points:source.points});
const linked=model.duplicate(id),custom=model.duplicate(id);
model.updateClip(custom,{duration:2,offset:1});
model.begin(); const result=model.addPoint(curveId,12,.9); model.commit();
assert.equal(result.source.length,12);assert.equal(result.index,3);
assert.equal(model.state().clips.find(c=>c.id===id).duration,12);
assert.equal(model.state().clips.find(c=>c.id===linked).duration,12);
assert.equal(model.state().clips.find(c=>c.id===custom).duration,2);
const signature=model.signature();result.source.points[0].v=.99;result.points[0].v=.88;
assert.equal(model.signature(),signature,'returned drag snapshots cannot alias the model');
model.undo();assert.equal(model.state().curves[0].length,4);assert.equal(model.state().clips[0].duration,4);
model.redo();assert.equal(model.state().curves[0].length,12);
saved=model.serialize();assert.equal(saved.v,1);
const restored=createTimelineModel();assert.equal(restored.restore(saved),true);assert.deepEqual(restored.serialize(),saved);
assert.equal(restored.makeUnique(custom),true);const unique=restored.state().clips.find(c=>c.id===custom).curveId;
restored.addPoint(curveId,16,.1);assert.equal(restored.state().curves.find(c=>c.id===unique).length,12);

// Missing legacy follow flags remain missing: no schema/signature rewrite or new auto-sizing.
const legacy=createTimelineModel();legacy.restore(saved);
const old=legacy.serialize();for(const clip of old.clips)delete clip.followSourceEnd;
assert.equal(legacy.restore(old),true);assert.deepEqual(legacy.serialize(),old);
legacy.addPoint(curveId,20,.2);assert.deepEqual(legacy.state().clips.map(c=>c.duration),old.clips.map(c=>c.duration));
legacy.updateClip(id,{duration:24});const inserted=legacy.addPoint(curveId,22,.6);
assert.equal(inserted.source.length,22);assert.equal(legacy.state().clips.find(c=>c.id===id).duration,24);
legacy.begin();legacy.movePoint(curveId,inserted.index,23,.8);legacy.cancel();assert.equal(legacy.state().curves[0].length,22);

// Long sources survive save/load intact. No shared 32-point truncation.
const many=Array.from({length:TIMELINE_MAX_SOURCE_POINTS},(_,i)=>({t:i/(TIMELINE_MAX_SOURCE_POINTS-1),v:i%2,tension:0}));
assert.equal(model.updateCurve(curveId,{points:many}),true);
const capped=model.signature();assert.equal(model.addPoint(curveId,100,.5).full,true);assert.equal(model.signature(),capped);
let refusedNotifications=0;const unsubscribe=model.subscribe(()=>refusedNotifications++);
model.begin();assert.equal(model.addPoint(curveId,100,.5).full,true);model.commit();unsubscribe();assert.equal(refusedNotifications,0);
assert.equal(model.updateCurve(curveId,{points:[...many,many.at(-1)]}),false);assert.equal(model.signature(),capped);
assert.equal(model.updateCurve(curveId,{length:100}),false);assert.equal(model.signature(),capped);
assert.equal(model.updateCurve(curveId,{points:many,length:1}),false);assert.equal(model.signature(),capped);
const long=createTimelineModel();assert.equal(long.restore(model.serialize()),true);assert.equal(long.state().curves[0].points.length,256);
assert.equal(normalizeTimelinePoints([{t:0,v:NaN,tension:0},{t:1,v:1,tension:0}]),null);

const total=long.serialize();total.curves=[];total.clips=[];
for(let i=0;i<TIMELINE_MAX_TOTAL_POINTS/TIMELINE_MAX_SOURCE_POINTS;i++){
  total.curves.push({id:'curve'+(100+i),targetId:'camera.rotation',name:'LONG',length:4,min:0,max:1,color:'#a7adb8',points:structuredClone(many)});
  total.clips.push({id:'clip'+(1000+i),curveId:'curve'+(100+i),laneId:total.lanes[0].id,start:i*4,duration:4,offset:0,scale:1,mute:false});
}
assert.equal(long.restore(total),true);const full=long.signature();
assert.equal(long.create({targetId:'camera.rotation',value:.3,start:1000}),null);
assert.equal(long.duplicate(total.clips[0].id,true),null);assert.equal(long.signature(),full);
const linkedFull=long.duplicate(total.clips[0].id);assert.ok(linkedFull);
assert.equal(long.makeUnique(linkedFull),false);
const oversized=structuredClone(total);oversized.curves.push({...total.curves[0],id:'curve9999'});
const beforeReject=long.signature();assert.equal(long.restore(oversized),false);assert.equal(long.signature(),beforeReject);
const malformed=structuredClone(saved);malformed.seq=4.5;assert.equal(restored.restore(malformed),true);assert.ok(Number.isInteger(restored.serialize().seq));
const drag=createTimelineModel(),dragClip=drag.create({targetId:'camera.rotation',value:.2});
const dragCurve=drag.state().curves[0];drag.updateCurve(dragCurve.id,{points:source.points});const snapshot=drag.state().curves[0];
drag.begin();const far=drag.movePoint(snapshot.id,1,9,.6);drag.movePoint(snapshot.id,far.index,1,.7);drag.commit();
const moved=drag.state().curves[0];assert.equal(moved.length,9);
assert.deepEqual(moved.points.map(p=>p.t*moved.length),[0,1,4]);assert.equal(moved.points[1].v,.7);
assert.equal(drag.state().clips.find(c=>c.id===dragClip).duration,9);
drag.undo();assert.deepEqual(drag.state().curves[0],snapshot);

// Index entries retain live references during field edits; snapshot replacement
// and structural changes must rebuild them. Compare playback to the serialized
// arrangement after each operation, rather than asserting implementation flags.
const indexed=createTimelineModel(),indexedClip=indexed.create({targetId:'camera.rotation',value:.1});
const second=indexed.create({targetId:'camera.rotation',value:.8,start:4});
function checkIndex() {
  const data=indexed.state();
  for (const beat of [0,1,2,3.5,4,5,7.5,8,9,11.5,12]) {
    const winner=data.clips.filter(c=>!c.mute && c.start<=beat && beat<c.start+c.duration)
      .sort((a,b)=>b.start-a.start || b.id.localeCompare(a.id,undefined,{numeric:true}))[0];
    const curve=winner && data.curves.find(c=>c.id===winner.curveId);
    const expected=curve ? curve.min+(curve.max-curve.min)*evaluateTimelineSource(curve,(beat-winner.start)*winner.scale+winner.offset) : null;
    assert.equal(indexed.value('camera.rotation',beat),expected);
  }
  assert.equal(indexed.needsClock(),data.clips.some(c=>!c.mute));
}
checkIndex();
const firstSource=indexed.state().clips.find(c=>c.id===indexedClip).curveId;
indexed.updateClip(second,{start:2,duration:6});checkIndex();
indexed.updateClip(second,{mute:true});checkIndex();indexed.undo();checkIndex();indexed.redo();checkIndex();
indexed.updateClip(indexedClip,{scale:2,offset:1,laneId:indexed.state().lanes[1].id});checkIndex();
indexed.updateCurve(firstSource,{name:'LIVE',color:'#e2b579',min:.2,max:.9});checkIndex();
const mid=indexed.addPoint(firstSource,2,.6);checkIndex();
indexed.setTension(firstSource,0,.8);checkIndex();
indexed.movePoint(firstSource,mid.index,6,.3);checkIndex();
indexed.removePoint(firstSource,1);checkIndex();
indexed.begin();indexed.updateClip(indexedClip,{start:6});checkIndex();indexed.cancel();checkIndex();
const indexedCopy=indexed.duplicate(indexedClip);checkIndex();indexed.makeUnique(indexedCopy);checkIndex();
indexed.deleteClip(second);checkIndex();indexed.undo();checkIndex();indexed.redo();checkIndex();
assert.equal(indexed.restore(indexed.serialize()),true);checkIndex();

// Small projects keep 64 undo commands. Undo/redo transfers consume one shared
// history budget, and a new branch clears only the old future.
const small=createTimelineModel();small.create({targetId:'camera.rotation',value:.2});const smallSource=small.state().curves[0].id;
for(let i=0;i<64;i++)small.updateCurve(smallSource,{name:'SMALL '+String(i).padStart(2,'0')});
for(let i=0;i<TIMELINE_HISTORY_LIMIT;i++)assert.equal(small.undo(),true);
assert.equal(small.undo(),false);assert.equal(small.state().curves[0].name,'camera.rotation');
for(let i=0;i<TIMELINE_HISTORY_LIMIT;i++)assert.equal(small.redo(),true);
assert.equal(small.redo(),false);assert.equal(small.state().curves[0].name,'SMALL 63');
small.undo();small.undo();small.updateCurve(smallSource,{name:'BRANCH'});assert.equal(small.redo(),false);
small.begin();small.updateCurve(smallSource,{name:'CANCELED'});small.cancel();assert.equal(small.state().curves[0].name,'BRANCH');
assert.equal(small.undo(),true);assert.equal(small.state().curves[0].name,'SMALL 61');
small.restore(null);assert.equal(small.undo(),false);assert.equal(small.redo(),false);

// The old format's full 1024 × 32-point capacity remains accepted. Use an
// equivalent larger source layout for the byte-budget test below.
const oldMaximum={v:1,seq:10000,meter:4,lanes:[{id:'lane1',name:'LANE 1'}],curves:[],clips:[]};
for(let i=0;i<1024;i++){
  oldMaximum.curves.push({id:'curve'+i,targetId:'camera.rotation',name:'LARGE',color:'#a7adb8',length:4,min:0,max:1,points:Array.from({length:32},(_,j)=>({t:j/31,v:j%2,tension:0}))});
  oldMaximum.clips.push({id:'clip'+i,curveId:'curve'+i,laneId:'lane1',start:i*4,duration:4,offset:0,scale:1,mute:false});
}
const big=createTimelineModel();assert.equal(big.restore(oldMaximum),true);
assert.equal(big.state().curves.reduce((n,c)=>n+c.points.length,0),32768);
assert.equal(big.addPoint('curve0',5,.3).full,true);assert.ok(big.movePoint('curve0',1,.2,.4));
const largeState=big.serialize();assert.equal(big.restore(largeState),true);
const bytes=new TextEncoder().encode(big.signature()).byteLength;
for(let i=0;i<64;i++)big.updateCurve('curve0',{name:'LARGE '+String(i).padStart(2,'0')});
const expectedCount=Math.floor(TIMELINE_HISTORY_BYTES/bytes);
assert.ok(expectedCount>1 && expectedCount<64);
let past=0;while(big.undo())past++;assert.equal(past,expectedCount);
let future=0;while(big.redo())future++;assert.equal(future,past);
assert.equal(big.state().curves[0].name,'LARGE 63');
// A mix of past/future plus a canceled transaction must not double-account or
// erase retained commands. Branching then releases future budget for new edits.
for(let i=0;i<3;i++)assert.equal(big.undo(),true);
const canceled=big.signature();big.begin();big.updateCurve('curve0',{name:'TRANSIENT'});big.cancel();assert.equal(big.signature(),canceled);
assert.equal(big.redo(),true);assert.equal(big.undo(),true);
big.updateCurve('curve0',{name:'BRANCH'});assert.equal(big.redo(),false);
for(let i=0;i<64;i++)big.updateCurve('curve0',{name:'AFTER '+String(i).padStart(2,'0')});
let branched=0;while(big.undo())branched++;assert.equal(branched,expectedCount);

// Keep one oversized recovery snapshot rather than disabling undo entirely.
const huge=createTimelineModel(),hugeState=small.serialize();
hugeState.lanes[0].name='🍈'.repeat(TIMELINE_HISTORY_BYTES/4+16);
assert.equal(huge.restore(hugeState),true);huge.create({targetId:'camera.rotation',value:.5});
const hugeSource=huge.state().curves[0].id;
huge.updateCurve(hugeSource,{name:'FIRST'});huge.updateCurve(hugeSource,{name:'SECOND'});
assert.equal(huge.undo(),true);assert.equal(huge.state().curves[0].name,'FIRST');assert.equal(huge.undo(),false);
assert.equal(huge.redo(),true);assert.equal(huge.state().curves[0].name,'SECOND');assert.equal(huge.redo(),false);
huge.restore(null);assert.equal(huge.undo(),false);assert.equal(huge.redo(),false);
console.log('Timeline source extension, exact MIR reads, live indexes, legacy capacity, source budgets and bounded undo/redo pass.');
