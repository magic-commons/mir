import assert from 'node:assert/strict';
import {createModHost} from '../mir/modulation/host.js';
const H=createModHost({roots:['test'],presentationActive:false});H.model.modReset();let value=.2;
H.targets.install({id:'test.level',map:'linear',min:0,max:1,get:()=>value,set:v=>{value=v;}});
H.clock.setAutomation({value:(id,beat)=>id==='test.level'&&beat<4?beat/4:null});H.clock.demand('automation',true);
assert.equal(H.clock.play(0).ok,true);assert.equal(value,0);H.clock.step(2);assert.equal(H.model.transport.beats,2);assert.equal(value,.5);assert.equal(H.registry.baseOf('test.level'),.2);
H.clock.pause();assert.equal(value,.2);H.clock.seek(1);assert.equal(value,.25);assert.equal(H.registry.baseOf('test.level'),.2);
H.model.deserializeRack({seq:{macro:1,source:0,route:1},sources:[],macros:[{id:'m1',value:1,sourceId:null}],routes:[{id:'r1',macroId:'m1',targetId:'test.level',min:0,max:.1}]});H.targets.sync();H.clock.seek(1);assert.ok(Math.abs(value-.35)<1e-12);
H.clock.setModulationEnabled(false);H.clock.seek(1);assert.equal(value,.25);H.clock.setAutomation(null);assert.equal(value,.2);assert.equal(H.registry.isModulated('test.level'),false);
H.clock.setEnabled(false);H.clock.setAutomation({value:()=>.9});H.clock.applyAll(true);assert.equal(value,.2);H.clock.step(0);assert.equal(value,.9); // deterministic door remains independent of arm
console.log('PASS automation host: source-free demand, zero-time anchor, composition, route bypass, seek, base release and deterministic arm law');
