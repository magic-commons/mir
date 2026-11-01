import assert from 'node:assert/strict';
import { createTimelineModel } from '../mir/timeline/model.js';
import { evaluateTimelineSource, setTimelineSegment, slideTimelinePoint, addTimelinePoint, moveTimelinePoint, drawTimelinePoints, normalizeTimelinePoints } from '../mir/timeline/source.js';
import { timelineStepSamples } from '../mir/timeline/draw.js';
import { createTimelinePlot } from '../mir/timeline/curve-view.js';
import { evaluate } from '../mir/modulation/curve.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const source={length:8,points:[{t:0,v:.2,tension:.4},{t:.25,v:.8,tension:-.3},{t:.5,v:.4,tension:.7},{t:1,v:.6,tension:0}]};
const original=JSON.stringify(source);
// Default sources still read MIR bit-for-bit and serialize without new fields.
assert.deepEqual(normalizeTimelinePoints(source.points),source.points);
for(let beat=0;beat<=8;beat+=.03125)assert.equal(evaluateTimelineSource(source,beat),evaluate(source.points,beat/8));
const held=setTimelineSegment(source,0,'hold').source;
for(const beat of [0,.0001,.5,1,1.999999])assert.equal(evaluateTimelineSource(held,beat),.2);
assert.equal(evaluateTimelineSource(held,2),.8);
for(const beat of [2,2.25,3,4,7,8])assert.equal(evaluateTimelineSource(held,beat),evaluateTimelineSource(source,beat));
assert.deepEqual(setTimelineSegment(held,0,'single').source,source);
assert.equal(setTimelineSegment(source,3,'hold').invalid,true);
assert.equal(normalizeTimelinePoints([{t:0,v:0,tension:0,segment:'bogus'},{t:1,v:1,tension:0}]),null);
assert.equal(addTimelinePoint(held,1,.2).points[1].segment,'hold');
assert.equal(moveTimelinePoint(held,0,.5,.3).points[0].segment,'hold');
assert.equal(setTimelineSegment(held,1,'hold').points[1].tension,-.3,'Hold retains authored tension for returning to Single');

// Hold paint contains the exact horizontal plateau/vertical jump and no
// meaningless tension handle. The same behavior survives crop/scale.
const clip={start:4,duration:8,offset:0,scale:1};
const plot=createTimelinePlot(clip,held,20,100);
assert.ok(plot.path.includes('L40,80L40,19.999999999999996'));
assert.deepEqual(plot.handles.map(p=>p.i),[1,2]);
const crop=createTimelinePlot({...clip,duration:1,offset:.5,scale:1.5},held,20,100);
assert.ok(crop.path.endsWith('L20,80L20,19.999999999999996'));
assert.equal(crop.points.at(-1).x,20);

// Slide changes downstream time only, preserves spacing, clamps to the prior
// point on a leftward drag and keeps untouched points at their authored beats.
const slid=slideTimelinePoint(source,1,5,.9).source;
assert.deepEqual(slid.points.map(p=>p.t*slid.length),[0,5,7,11]);
assert.deepEqual(slid.points.map(p=>p.v),[.2,.9,.4,.6]);
assert.equal(slid.length,11);assert.equal(slid.points[2].tension,.7);
const back=slideTimelinePoint(slid,1,2,.8).source;
assert.deepEqual(back.points.map(p=>p.t*back.length),[0,2,4,8]);
const clamped=slideTimelinePoint(source,2,-10,.3).source;
assert.deepEqual(clamped.points.map(p=>p.t*clamped.length),[0,2,2,6]);
assert.equal(slideTimelinePoint(source,9,1,0).invalid,true);
assert.equal(slideTimelinePoint({length:Number.MAX_VALUE,points:[{t:0,v:0,tension:0},{t:1,v:1,tension:0}]},0,Number.MAX_VALUE,.5).invalid,true);

// Fast strokes fill every crossed grid line in either direction. Origin is
// world beat zero expressed in source time, not necessarily source beat zero.
assert.deepEqual(timelineStepSamples({beat:1,value:.2},{beat:5,value:.8},{step:1}),[
  {beat:1,value:.2},{beat:2,value:.35000000000000003},{beat:3,value:.5},{beat:4,value:.6500000000000001},{beat:5,value:.8}]);
assert.deepEqual(timelineStepSamples({beat:5,value:1},{beat:1,value:0},{step:1}).map(p=>p.beat),[5,4,3,2,1]);
assert.deepEqual(timelineStepSamples({beat:.6,value:.3},{beat:2.6,value:.9},{step:1,origin:.5}).map(p=>p.beat),[.5,1.5,2.5]);
assert.deepEqual(timelineStepSamples({beat:.6,value:.3},{beat:2.6,value:.9},{step:1,origin:.5,min:.6,max:2.6}).map(p=>p.beat),[.6,1.5,2.5]);
assert.equal(timelineStepSamples({beat:0,value:0},{beat:300,value:1},{step:1}),null);
assert.equal(timelineStepSamples({beat:1e20,value:0},{beat:1e20,value:1},{step:1}),null);
assert.equal(timelineStepSamples({beat:1,value:0},{beat:1,value:1},{step:1,max:NaN}),null);
const samples=timelineStepSamples({beat:2,value:.1},{beat:4,value:.9},{step:1});
const drawn=drawTimelinePoints(source,samples,{hold:true,tension:.6}).source;
assert.deepEqual(drawn.points.map(p=>p.t*drawn.length),[0,2,3,4,8]);
assert.equal(drawn.points[0].v,.2);assert.equal(drawn.points.at(-1).v,.6);
assert.equal(drawn.points[1].segment,'hold');assert.equal(drawn.points[2].tension,.6);
assert.equal(evaluateTimelineSource(drawn,2.99),.1);
const redrawn=drawTimelinePoints(drawn,[{beat:3,value:.7}]).source;
assert.equal(redrawn.points.length,drawn.points.length);assert.equal(redrawn.points[2].v,.7);
assert.equal(redrawn.points[2].segment,undefined);
const offGrid={length:8,points:[...source.points,{t:.375,v:1,tension:0}].sort((a,b)=>a.t-b.t)};
const overwritten=drawTimelinePoints(offGrid,[{beat:2,value:.1},{beat:4,value:.9}]);
assert.deepEqual(overwritten.points.map(p=>p.t*overwritten.length),[0,2,4,8]);
const full={length:256,points:Array.from({length:256},(_,i)=>({t:i/255,v:.5,tension:0}))};
assert.equal(drawTimelinePoints(full,[{beat:.1,value:.8}]).full,true);
assert.equal(JSON.stringify(source),original,'editing functions do not mutate their inputs');

// UI operations must compose with live playback, linked instances, one undo
// per stroke, cancellation, source growth, save/load and independent copies.
const m=createTimelineModel(),id=m.create({targetId:'camera.rotation',value:.2,duration:8}),curve=m.state().curves[0].id;
m.updateCurve(curve,{points:source.points});const linked=m.duplicate(id),manual=m.duplicate(id);m.updateClip(manual,{duration:3});
m.setSegment(curve,0,'hold');assert.equal(m.value('camera.rotation',1),.2);
const saved=m.serialize(),restore=createTimelineModel();assert.equal(restore.restore(saved),true);assert.deepEqual(restore.serialize(),saved);
assert.equal(restore.value('camera.rotation',1),.2);
m.begin();m.movePoint(curve,1,5,.9,{slide:true});m.commit();
near(m.state().clips.find(c=>c.id===id).duration,11);near(m.state().clips.find(c=>c.id===linked).duration,11);
assert.equal(m.state().clips.find(c=>c.id===manual).duration,3);
m.undo();assert.deepEqual(m.serialize(),saved);m.redo();
const preStroke=m.serialize();m.begin();m.drawPoints(curve,samples,{hold:true});m.drawPoints(curve,[{beat:5,value:.5},{beat:6,value:.1}]);m.commit();
m.undo();assert.deepEqual(m.serialize(),preStroke);m.redo();
const sig=m.signature();m.begin();m.drawPoints(curve,[{beat:7,value:.3}]);m.cancel();assert.equal(m.signature(),sig);
assert.equal(m.makeUnique(linked),true);const unique=m.state().clips.find(c=>c.id===linked).curveId;
m.setSegment(unique,0,'single');assert.equal(m.state().curves.find(c=>c.id===curve).points[0].segment,'hold');
assert.equal(m.restore(m.serialize()),true);

// 1.5.6-alpha.21 · THE ARRANGEMENT'S LAW: overlapping clips on one target — the highest lane wins (lanes[0] is the
// top), then the earliest start, then the lower id; a muted clip never plays. (Was: the latest start won.)
{ const a=createTimelineModel(),flat=v=>[{t:0,v,tension:0},{t:1,v,tension:0}];
  const low=a.create({targetId:'camera.zoom',value:.3,start:0,duration:8,laneId:'lane3'}),high=a.create({targetId:'camera.zoom',value:.7,start:2,duration:4,laneId:'lane1'});
  assert.equal(a.state().clips.find(c=>c.id===high).laneId,'lane1');
  near(a.value('camera.zoom',1),.3);near(a.value('camera.zoom',3),.7,'the higher lane wins though it starts later');near(a.value('camera.zoom',7),.3);
  a.updateClip(high,{mute:true});near(a.value('camera.zoom',3),.3,'a muted clip stands aside');a.updateClip(high,{mute:false});
  const late=a.create({targetId:'camera.zoom',value:.9,start:4,duration:4,laneId:'lane3'});a.updateClip(late,{laneId:'lane2'});
  near(a.value('camera.zoom',5),.7,'lane 1 over lane 2');a.moveClips([high],{laneDelta:3});
  near(a.value('camera.zoom',5),.9,'lane 2 over lane 4 once lane 1 moves down');
  a.updateClip(late,{laneId:'lane3'});near(a.value('camera.zoom',5),.3,'one lane: the earliest start wins');
  a.updateClip(late,{start:0});const ids=[low,late].sort((x,y)=>x.localeCompare(y,undefined,{numeric:true}));
  near(a.value('camera.zoom',1),a.state().curves.find(c=>c.id===a.state().clips.find(k=>k.id===ids[0]).curveId).points[0].v,'a tie: the lower id');
  // extent: the first start … the last end, unmuted by default
  const e=createTimelineModel();assert.equal(e.extent(),null);
  const c1=e.create({targetId:'camera.zoom',value:.5,start:2,duration:4}),c2=e.create({targetId:'camera.pan',value:.5,start:10,duration:2});
  assert.deepEqual(e.extent(),{start:2,end:12});e.updateClip(c2,{mute:true});assert.deepEqual(e.extent(),{start:2,end:6});
  assert.deepEqual(e.extent({unmuted:false}),{start:2,end:12});e.updateClip(c1,{mute:true});assert.equal(e.extent(),null);
  // THE STRETCH: duration and scale together, the source span held, the shape kept; the start edge moves start
  const s=createTimelineModel(),sc=s.create({targetId:'camera.zoom',value:0,start:4,duration:8}),sid=s.state().curves[0].id;
  s.updateCurve(sid,{points:[{t:0,v:0,tension:0},{t:1,v:1,tension:0}]});const before=[0,.25,.5,.75].map(f=>s.value('camera.zoom',4+8*f));
  assert.equal(s.stretchClip(sc,'end',16),true);let k=s.state().clips[0];assert.deepEqual([k.start,k.duration,k.scale,k.followSourceEnd],[4,16,.5,false]);
  [0,.25,.5,.75].forEach((f,i)=>near(s.value('camera.zoom',4+16*f),before[i]));
  assert.equal(s.stretchClip(sc,'start',4),true);k=s.state().clips[0];assert.deepEqual([k.start,k.duration,k.scale],[16,4,2]);
  [0,.25,.5,.75].forEach((f,i)=>near(s.value('camera.zoom',16+4*f),before[i]));
  assert.equal(s.stretchClip(sc,'start',100),true);k=s.state().clips[0];assert.equal(k.start,0);assert.equal(k.duration,20,'the start edge stops at beat 0');
  const o={...s.state().clips[0]};s.begin();for(const d of [24,31,9,20])s.stretchClip(sc,'end',d,{original:o});s.commit();
  assert.deepEqual(s.state().clips[0],{...o,followSourceEnd:false},'reversed through the original: exact');
  assert.equal(s.stretchClip(sc,'end',0),false);assert.equal(s.stretchClip(sc,'middle',4),false);assert.equal(s.stretchClip('nope','end',4),false);
  const sig2=s.signature();s.stretchClip(sc,'end',3);s.undo();assert.equal(s.signature(),sig2,'one stretch, one undo');
  // steps: optional on a curve; an older file opens unchanged; restore drops a bad one; updateCurve sets and clears it
  const st=createTimelineModel(),ev=st.create({targetId:'material.style',value:.5,source:{steps:10}});
  assert.equal(st.state().curves[0].steps,10);const cid=st.state().curves[0].id;
  assert.equal(st.updateCurve(cid,{steps:12}),true);assert.equal(st.state().curves[0].steps,12);
  assert.equal(st.updateCurve(cid,{steps:1}),false);assert.equal(st.updateCurve(cid,{steps:2.5}),false);assert.equal(st.state().curves[0].steps,12);
  const dup=st.duplicate(ev,true);assert.equal(st.state().curves.find(c=>c.id===st.state().clips.find(x=>x.id===dup).curveId).steps,12,'a copy keeps its bands');
  const wire=st.serialize(),re=createTimelineModel();assert.equal(re.restore(wire),true);assert.deepEqual(re.serialize(),wire);
  assert.equal(st.updateCurve(cid,{steps:null}),true);assert.equal('steps' in st.state().curves[0],false);
  const bad=JSON.parse(JSON.stringify(wire));bad.curves[0].steps=-3;assert.equal(re.restore(bad),true);assert.equal('steps' in re.state().curves[0],false);
  assert.equal(createTimelineModel().create({targetId:'material.style',value:.5,source:{steps:'x'}})!=null,true);
  const old=saved;assert.equal(re.restore(old),true);assert.deepEqual(re.serialize(),old,'a file without steps opens byte for byte');
}
console.log('Timeline Hold playback/vertical paint, Slide musical timing, Step strokes, snapshots, linked instances, undo/cancel, the arrangement\'s law, extent, the stretch and steps pass.');
