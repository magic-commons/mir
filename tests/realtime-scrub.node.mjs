import assert from 'node:assert/strict';
import {createModHost} from '../mir/modulation/host.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const sync of ['wall','free'])for(const playing of [true,false])for(const mode of ['BASE','HOLD']){
  const H=createModHost({roots:['test'],wall:10,presentationActive:false,exactResume:true,automationHold:true}),M=H.model,C=H.clock;
  M.modReset({bare:true});M.setTransport({bpm:60,sync});let value=.2;
  H.targets.install({id:'test.level',map:'linear',min:0,max:1,get:()=>value,set:v=>value=v});
  for(const anchor of [true,false]){const s=M.addSource('lfo',{on:true,wave:'sine',sync:true,anchor,smooth:0});const m=M.addMacro();M.setMacro(m.id,{sourceId:s.id});M.addRoute(m.id,'test.level',0,.05);}
  const free=M.addSource('lfo',{on:true,wave:'sine',sync:false,smooth:0});H.targets.sync();
  C.demand('transport',true);C.setPauseMode(mode);C.setAutomation({value:(_,beat)=>beat/100});C.seek(2.375);if(playing)C.play(10);
  C.hold('1/4');const plays=C.stats().plays,demands=C.snapshot().demands,phases=M.snapshotPhases();
  const release=C.suspendRealtime(10);assert.equal(typeof release,'function');assert.equal(C.suspendRealtime(10),null);
  C.advanceTo(25);assert.equal(M.transport.beats,2.375);assert.equal(C.isPlaying(),playing);assert.equal(C.isRunning(),playing);assert.equal(M.transport.hold,true);
  assert.deepEqual(M.snapshotPhases(),phases,'Suspension itself advances neither free nor anchored phases');
  C.seek(5.375);const sought=M.transport.beats;assert.equal(sought,5.375);assert.equal(H.registry.baseOf('test.level'),.2);
  const freePhase=free.phase;C.setBpm(120);C.advanceTo(30);assert.equal(M.transport.beats,sought);assert.equal(free.phase,freePhase);
  assert.equal(release(30),true);assert.equal(release(40),false);assert.equal(C.isRealtimeSuspended(),false);assert.equal(C.stats().plays,plays);assert.deepEqual(C.snapshot().demands,demands);assert.equal(M.transport.hold,true);
  C.release();C.advanceTo(30);assert.equal(M.transport.beats,sought);C.advanceTo(30.05);near(M.transport.beats,sought+(playing?.1:0));
  H.dispose();
}
{
  const H=createModHost({roots:[],exactResume:true,presentationActive:false}),C=H.clock;H.model.modReset({bare:true});H.model.setTransport({bpm:60});C.demand('transport',true);C.play(1);   // 60 said out loud: the default is 30 since alpha.4, and the step below counts beats at one a second
  const release=C.suspendRealtime(1);C.seek(2);C.pause(2);release(10);C.advanceTo(11);assert.equal(C.isPlaying(),false);assert.equal(H.model.transport.beats,2,'User pause during scrub remains paused');
  C.play(11);const stale=C.suspendRealtime(11),runtime=C.captureRuntime();assert.equal(C.restoreRuntime(runtime,{wall:30}),true);assert.equal(stale(50),false);assert.equal(C.isRealtimeSuspended(),false);
  const stepRelease=C.suspendRealtime(30);const beat=H.model.transport.beats;C.step(.125);near(H.model.transport.beats,beat+.125);stepRelease(31);H.dispose();
}
console.log('PASS realtime scrub: single owner, wall/free reanchor, BASE/HOLD, phases, paused seek, tempo, demand, no play edge, restore invalidation and deterministic step');
