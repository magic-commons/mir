/* timeline.node.mjs — BASINS tools/test-timeline.mjs, ported (2026-10-02): the same assertions on the kit's modules.
 * Changed: the modulation window's sampleCurve check (BASINS app/curve-view.js, not the timeline's) became a finite-value
 * sweep; remapTimelineTarget (BASINS' palette law) became a check of the kit's remap PORT (timeline/project.js). */
import assert from 'node:assert/strict';
import {createTimelineModel,DEFAULT_TIMELINE_COLOR} from '../mir/timeline/model.js';
import {resizeTimelineClip,timelineLaneHeight,TIMELINE_TAB_HEIGHT,TIMELINE_ROW_GAP} from '../mir/timeline/geometry.js';
import {evaluate} from '../mir/modulation/curve.js';
import {timelinePart} from '../mir/timeline/project.js';
import {createModHost} from '../mir/modulation/host.js';
const model=createTimelineModel();assert.equal(model.state().lanes.length,4);
const clip=model.create({targetId:'camera.rotation',name:'ROTATION',value:.25});let d=model.state();assert.equal(d.clips[0].duration,4);assert.equal(model.value('camera.rotation',0),.25);assert.equal(model.value('camera.rotation',4),null);
assert.equal(d.curves[0].color,DEFAULT_TIMELINE_COLOR);
const original={...d.clips[0],start:8};
const pulled={...original,...resizeTimelineClip(original,'left',-2)};
assert.equal(pulled.start,6);assert.equal(pulled.start+pulled.duration,12);assert.equal(pulled.offset,0);assert.equal(pulled.scale,1);
model.updateCurve(d.curves[0].id,{points:[{t:0,v:0,tension:0},{t:1,v:1,tension:0}]});
model.updateClip(clip,original);assert.equal(model.value('camera.rotation',10),.5);
model.updateClip(clip,pulled);assert.equal(model.value('camera.rotation',8),.5);assert.equal(model.value('camera.rotation',11),1);
assert.equal(model.value('camera.rotation',12),null);
assert.deepEqual(resizeTimelineClip(original,'left',-100),{start:0,duration:12});
assert.deepEqual(resizeTimelineClip(original,'right',2),{duration:6});
assert.equal(timelineLaneHeight(344,4),58.5);assert.equal(timelineLaneHeight(344,4,0),66.5);assert.equal(TIMELINE_TAB_HEIGHT+TIMELINE_ROW_GAP,20);
model.updateClip(clip,{start:0,duration:4});
model.updateCurve(d.curves[0].id,{color:'#Be9bDd',name:'MY CURVE'});assert.equal(model.state().curves[0].color,'#be9bdd');model.undo();assert.equal(model.state().curves[0].color,DEFAULT_TIMELINE_COLOR);model.redo();
for(let i=0;i<=64;i++){const t=i/64;assert.ok(Number.isFinite(evaluate(model.state().curves[0].points,t)));} // BASINS' modulation sampleCurve check is the modulation window's, not the timeline's
model.updateCurve(d.curves[0].id,{points:[{t:0,v:0,tension:0},{t:1,v:1,tension:0}]});assert.equal(model.value('camera.rotation',2),.5);
model.updateClip(clip,{start:4,duration:2,offset:2});assert.equal(model.value('camera.rotation',4),.5);assert.equal(model.value('camera.rotation',5),.75);
model.begin();model.updateClip(clip,{start:12});model.cancel();assert.equal(model.state().clips[0].start,4);
model.begin();model.updateClip(clip,{start:8});model.updateClip(clip,{start:9});model.commit();model.undo();assert.equal(model.state().clips[0].start,4);model.redo();assert.equal(model.state().clips[0].start,9);
const row=d.lanes.at(-1).id;model.updateClip(clip,{laneId:row});assert.equal(model.removeLane(row).confirm,true);assert.equal(model.state().lanes.length,4);assert.equal(model.removeLane(row,true).count,1);assert.equal(model.state().curves.length,0);model.undo();assert.equal(model.state().clips.length,1);
const copy=model.duplicate(clip);assert.equal(model.state().clips[0].curveId,model.state().clips[1].curveId);model.makeUnique(copy);assert.notEqual(model.state().clips[0].curveId,model.state().clips[1].curveId);
const saved=model.serialize();const other=createTimelineModel();assert.equal(other.restore(saved),true);assert.deepEqual(other.serialize(),saved);assert.equal(other.restore({...saved,lanes:[]}),false);assert.deepEqual(other.serialize(),saved);
const legacy=structuredClone(saved);for(const c of legacy.curves)delete c.color;assert.equal(other.restore(legacy),true);assert.ok(other.state().curves.every(c=>c.color===DEFAULT_TIMELINE_COLOR));
other.updateCurve(other.state().curves[0].id,{color:'url(invalid)'});assert.equal(other.state().curves[0].color,DEFAULT_TIMELINE_COLOR);
{const m=createTimelineModel();m.create({targetId:'palette.ee9.phase',value:.5});const doc=m.serialize();const part=timelinePart(createTimelineModel(),{remap:(id,saved)=>id==='palette.ee9.phase'&&saved===doc?'palette.ee21.phase':id});const back=createTimelineModel();const p2=timelinePart(back,{remap:(id)=>id==='palette.ee9.phase'?'palette.ee21.phase':id});assert.equal(p2.restore(doc),true);assert.equal(back.state().curves[0].targetId,'palette.ee21.phase');assert.equal(timelinePart(createTimelineModel()).capture(),null);assert.ok(part);} // the remap PORT (BASINS' remapTimelineTarget stays BASINS')
// No sources: Timeline alone supplies clock demand, exactly one registry writer, no base edits.
model.restore(null);model.create({targetId:'camera.rotation',value:.5});
const H=createModHost({roots:['camera'],presentationActive:false});H.model.modReset();H.clock.setBpm(60);let actual=.2; /* BASINS' default tempo is 60; the kit's is 30 (Josh, 2026-10-01) */
H.targets.install({id:'camera.rotation',min:0,max:1,map:'linear',get:()=>actual,set:v=>{actual=v;}});
H.clock.setAutomation({value:(id,beat)=>model.value(id,beat)});H.clock.demand('timeline',true);assert.equal(H.clock.play(0).ok,true);assert.equal(actual,.5);assert.equal(H.registry.baseOf('camera.rotation'),.2);
H.clock.step(2);assert.equal(H.model.transport.beats,2);assert.equal(actual,.5);H.clock.pause();assert.equal(actual,.2);
H.clock.seek(1);assert.equal(actual,.5);assert.equal(H.registry.baseOf('camera.rotation'),.2);
H.clock.setHidden(true);H.clock.seek(0);H.clock.step(4);assert.equal(actual,.2);H.clock.setHidden(false);
// Same compositor layers a hand macro over the clip, and can bypass routes for Timeline-only export.
H.model.deserializeRack({seq:{macro:1,source:0,route:1},macros:[{id:'m1',name:'HAND',value:1,sourceId:null}],sources:[],routes:[{id:'r1',macroId:'m1',targetId:'camera.rotation',min:0,max:.1}]});H.targets.sync();H.clock.seek(0);assert.ok(Math.abs(actual-.6)<1e-12);H.clock.setModulationEnabled(false);H.clock.seek(0);assert.equal(actual,.5);H.clock.setAutomation(null);assert.equal(actual,.2);
console.log('Timeline model, trim/undo, shared definitions, validation, palette remapping, source-free playback, composition, seek and base release pass.');
