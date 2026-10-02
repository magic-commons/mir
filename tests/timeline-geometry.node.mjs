import assert from 'node:assert/strict';
import { createClipCoordinates, timelineResizeDelta, resizeTimelineClip, snapTimelineBeat } from '../mir/timeline/geometry.js';
import { createTimelinePlot } from '../mir/timeline/curve-view.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);
const source={length:8,points:[{t:0,v:1,tension:0},{t:.375,v:.2,tension:.7},{t:1,v:0,tension:0}]};
const clip={start:4.25,duration:8,offset:0,scale:1};
const first=createTimelinePlot(clip,source,20,64);
assert.equal(first.points[0].x,0);assert.equal(first.points[0].y,0);
assert.equal(first.points.at(-1).x,160);assert.equal(first.points.at(-1).y,64);
for(const duration of [4,16,2,8]){
 const g=createClipCoordinates({...clip,duration},8,20,64);
 assert.equal(g.xAtTime(.375),60);assert.equal(g.sourceBeatAtX(60),3);
 close(g.timeAtX(g.xAtTime(.375)),.375);
}
// Offset/stretch changes are explicit; clip width itself has no scale effect.
const cropped={...clip,duration:2,offset:3.5,scale:.5};
const plot=createTimelinePlot(cropped,source,32,80);
assert.equal(plot.points.length,0); // No invisible source point can steal a grab.
assert.equal(plot.geometry.width,64);
close(plot.geometry.sourceBeatAtWorldBeat(clip.start+1),4);
close(plot.geometry.xAtSourceBeat(4),32);
assert.ok(plot.path.startsWith('M0,'));assert.ok(plot.fill.endsWith('L64,80L0,80Z'));
// Snap the held right end, rather than using a fractional clip start as anchor.
const fractional={...clip,duration:4.5};
const delta=timelineResizeDelta(fractional,'right',.25,1);
const resized={...fractional,...resizeTimelineClip(fractional,'right',delta)};
assert.equal(resized.start+resized.duration,9);
assert.equal(timelineResizeDelta(fractional,'right',.25,1,true),.25);
assert.equal(snapTimelineBeat(4.37,1),4);assert.equal(snapTimelineBeat(4.37,1,true),4.37);
// A tiny crop of a long source spends samples in visible time, not hidden data.
const long={length:1000,points:source.points};
const longPlot=createTimelinePlot({...clip,duration:1,offset:500},long,100,64);
assert.ok((longPlot.path.match(/L/g)||[]).length>=99);
assert.ok((longPlot.path.match(/L/g)||[]).length<=102);
console.log('Timeline musical mapping, exact bounds, crop hits, held-edge snap and visible sampling pass.');
