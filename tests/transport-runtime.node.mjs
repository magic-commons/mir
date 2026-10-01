import assert from 'node:assert/strict';
import { createModHost } from '../mir/modulation/host.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);

function rig(options={}) {
  const host=createModHost({roots:['test'],wall:10,presentationActive:false,...options});
  host.model.modReset({bare:true});host.model.setTransport({bpm:60,sync:'wall'});
  let current=.2;const writes=[];
  host.targets.install({id:'test.level',map:'linear',min:0,max:1,get:()=>current,set:v=>{current=v;writes.push(v);}});
  const source=host.model.addSource('lfo',{on:true,wave:'sawup',sync:true,smooth:0});
  const macro=host.model.addMacro();host.model.setMacro(macro.id,{sourceId:source.id});
  host.model.addRoute(macro.id,'test.level',0,.1);host.targets.sync();
  host.clock.demand('transport',true);
  return {host,source,writes,value:()=>current};
}

// Exact cursor ownership is opt-in. Default consumers keep their established
// source-grid resume law, including a deliberate backwards quantization.
{
  const {host}=rig();host.clock.seek(2.375);const legacy=host.clock.play(10);
  assert.equal(legacy.resume.applied,true);assert.ok(host.model.transport.beats<2.375);
  host.clock.pause();host.clock.seek(2.375);host.clock.setExactResume(true);
  const exact=host.clock.play(10);assert.equal(host.model.transport.beats,2.375);assert.equal(exact.resume.applied,false);
  host.clock.pause();host.clock.seek(2.375);host.clock.setExactResume(false);
  host.clock.play(10,{resume:'exact'});assert.equal(host.model.transport.beats,2.375);
  assert.equal(host.clock.isExactResume(),false,'edge override does not change future policy');
}
{
  const {host,source}=rig({wall:0,exactResume:true});host.clock.seek(2.375);host.clock.play(0);
  assert.equal(host.model.transport.beats,2.375);
  close(source.phase,2.375/host.model.beatsPerCycle(source)%1);
}

// A stopped Timeline keeps its cursor baseline on every ordinary apply, while
// BASE releases LFO offsets and hand macro offsets retain their existing law.
{
  const {host,value}=rig({automationHold:true});
  host.clock.setAutomation({value:(_,beat)=>beat<4?.75:null});host.clock.seek(3.25);
  assert.equal(value(),.75); // Seek follows BASE immediately; no transient LFO output.
  host.clock.applyAll(true);assert.equal(value(),.75);assert.equal(host.registry.baseOf('test.level'),.2);
  const hand=host.model.addMacro();host.model.setMacro(hand.id,{value:1});host.model.addRoute(hand.id,'test.level',0,.05);host.targets.sync();
  host.clock.applyAll(true);close(value(),.8);assert.equal(host.registry.baseOf('test.level'),.2);
  host.clock.setBpm(80);close(value(),.8);
  host.clock.setPauseMode('HOLD');assert.ok(value()>.8);host.clock.setPauseMode('BASE');close(value(),.8);
  host.clock.setModulationEnabled(false);assert.equal(value(),.75);
  host.clock.seek(5);assert.equal(value(),.2,'outside clips releases to the authored base');
  host.clock.setAutomationHold(false);host.clock.seek(3);host.clock.applyAll(true);assert.equal(value(),.2);
}

// Suspension saves folded stutter position AND the unfurled shadow, envelopes,
// smoothers, host demand/policy, and the wall bridge. Restore emits only the
// final value; it never passes through a BASE, retrigger or seek edge.
{
  const {host,source,writes,value}=rig({exactResume:true,automationHold:true});
  const free=host.model.addSource('lfo',{on:true,wave:'sine',sync:false,smooth:.4});
  const env=host.model.addSource('env',{a:.2,hold:.3,d:.4,s:.6,r:.5});
  host.clock.play(10);host.clock.step(2.375);host.model.setSource(env.id,{retrigger:true});
  assert.equal(host.clock.hold('1/4'),true);host.clock.step(.2);
  const originalValue=value(),saved=host.clock.captureRuntime(),savedModel=host.model.snapshotRuntime();
  assert.equal(savedModel.transport.hold,true);assert.equal(savedModel.phases.sources.get(source.id).shadowed,true);
  host.clock.pause();host.clock.setModulationEnabled(false);host.clock.setAutomationHold(false);host.clock.setExactResume(false);
  host.clock.demand('transport',false);host.clock.demand('temporary-render',true);host.model.resetPhases();host.clock.step(4);
  writes.length=0;assert.equal(host.clock.restoreRuntime(saved,{wall:100}),true);
  assert.deepEqual(writes,[originalValue]);assert.equal(host.clock.isPlaying(),true);assert.equal(host.clock.isRunning(),true);
  assert.deepEqual(host.clock.snapshot().demands,['transport']);assert.equal(host.clock.isExactResume(),true);assert.equal(host.clock.isAutomationHold(),true);
  const restored=host.model.snapshotRuntime();
  assert.deepEqual(restored.phases,savedModel.phases);assert.deepEqual(restored.macros,savedModel.macros);
  for(const key of Object.keys(savedModel.transport).filter(k=>!['wall','anchorAt','anchorBeats','anchorTime','pending'].includes(k)))assert.equal(restored.transport[key],savedModel.transport[key]);
  assert.equal(restored.transport.wall,100);assert.equal(restored.transport.anchorAt,100);
  assert.equal(restored.transport.anchorBeats,savedModel.transport.beats);
  host.clock.advanceTo(100);assert.equal(host.model.transport.beats,savedModel.transport.beats);
  host.clock.advanceTo(100.1);close(host.model.transport.beats,savedModel.transport.beats+.1);
  assert.equal(source.shadowed,true);assert.ok(Number.isFinite(free.cont));assert.ok(env.t>savedModel.phases.sources.get(env.id).t);
  const shadowPhase=source.shadowPhase;assert.equal(host.clock.release(),true);assert.equal(source.phase,shadowPhase);
  // Physical page visibility overrides captured visibility and releases a
  // gesture, without discarding playback intent or leaking temporary demands.
  writes.length=0;host.clock.restoreRuntime(saved,{wall:200,hidden:true});
  assert.equal(host.clock.isPlaying(),true);assert.equal(host.clock.isRunning(),false);assert.equal(host.model.transport.hold,false);
  assert.equal(source.shadowed,false);assert.equal(writes.length,1);
  host.clock.setHidden(false);assert.equal(host.clock.isRunning(),true);
  host.clock.restoreRuntime(saved,{wall:300,apply:false});assert.equal(host.model.transport.hold,true);
  const before=host.model.snapshotRuntime();assert.equal(host.clock.restoreRuntime({v:1,host:saved.host,model:null}),false);assert.deepEqual(host.model.snapshotRuntime(),before);
}

// Model-only suspension is exact when no wall rebasing is requested; legacy
// restorePhases continues releasing holds, as existing renderers expect.
{
  const {host}=rig();host.clock.play(10);host.clock.step(1.25);host.clock.hold('1/4');host.clock.step(.1);
  const runtime=host.model.snapshotRuntime();host.model.resetPhases();host.model.restoreRuntime(runtime);
  assert.deepEqual(host.model.snapshotRuntime(),runtime);
  host.model.restorePhases(host.model.snapshotPhases());assert.equal(host.model.transport.hold,false);
}
console.log('PASS transport runtime: legacy/exact resume, paused Timeline baseline, hand offsets, full hold/shadow/envelope restoration, visibility and atomic final output');
