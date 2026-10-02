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
console.log('Timeline Hold playback/vertical paint, Slide musical timing, Step strokes, snapshots, linked instances and undo/cancel pass.');
