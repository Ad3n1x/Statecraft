import { useEffect, useRef, useState } from 'react';
import { ArcRotateCamera, Color3, Color4, Engine, HemisphericLight, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';

type Kind = 'traffic' | 'robot' | 'conveyor' | 'solar';
type Theme = 'lab' | 'midnight' | 'sunset' | 'clean';
type Phase = 'GREEN' | 'YELLOW' | 'RED';
type SystemItem = { id: number; name: string; kind: Kind };
const phases: Phase[] = ['GREEN', 'YELLOW', 'RED'];
const colors: Record<Phase, Color3> = { GREEN: new Color3(.12,.95,.52), YELLOW: new Color3(1,.65,.1), RED: new Color3(1,.12,.16) };
const labels: Record<Kind, string> = { traffic: 'Traffic controller', robot: 'Robotic arm', conveyor: 'Conveyor line', solar: 'Solar array' };
const themes: Record<Theme, { bg: Color4; floor: Color3; grid: Color3; light: number }> = {
 lab:{bg:new Color4(.025,.045,.07,1),floor:new Color3(.045,.07,.09),grid:new Color3(.06,.16,.19),light:1},
 midnight:{bg:new Color4(.008,.012,.04,1),floor:new Color3(.018,.024,.06),grid:new Color3(.12,.1,.3),light:.7},
 sunset:{bg:new Color4(.14,.05,.04,1),floor:new Color3(.13,.065,.055),grid:new Color3(.32,.13,.08),light:1.05},
 clean:{bg:new Color4(.72,.79,.82,1),floor:new Color3(.56,.63,.66),grid:new Color3(.36,.47,.51),light:1.2}
};

function SystemScene({kind, theme, phase, running}:{kind:Kind;theme:Theme;phase:Phase;running:boolean}) {
 const canvas=useRef<HTMLCanvasElement>(null), phaseRef=useRef(phase), runRef=useRef(running), themeRef=useRef(theme), kindRef=useRef(kind);
 useEffect(()=>{phaseRef.current=phase},[phase]); useEffect(()=>{runRef.current=running},[running]); useEffect(()=>{themeRef.current=theme},[theme]); useEffect(()=>{kindRef.current=kind},[kind]);
 useEffect(()=>{
  if(!canvas.current)return; let engine:Engine;
  try{engine=new Engine(canvas.current,true,{antialias:true,stencil:true})}catch{return}
  const scene=new Scene(engine), camera=new ArcRotateCamera('camera',-Math.PI/2.15,Math.PI/2.7,9,new Vector3(0,1,0),scene);
  camera.attachControl(canvas.current,true);camera.lowerRadiusLimit=4;camera.upperRadiusLimit=18;camera.wheelPrecision=40;
  const light=new HemisphericLight('light',new Vector3(.2,1,.1),scene);light.intensity=1;new HemisphericLight('rim',new Vector3(-1,.5,-1),scene).intensity=.5;
  const material=(name:string,color:Color3,emissive=new Color3(0,0,0))=>{const m=new StandardMaterial(name,scene);m.diffuseColor=color;m.emissiveColor=emissive;return m};
  const metal=material('metal',new Color3(.19,.25,.31)), dark=material('dark',new Color3(.035,.055,.075)), cyan=material('cyan',new Color3(.1,.7,.78),new Color3(.01,.12,.15)), orange=material('orange',new Color3(1,.48,.12));
  const floor=MeshBuilder.CreateGround('floor',{width:24,height:24},scene), floorMat=material('floorMat',themes[theme].floor), gridMat=material('gridMat',themes[theme].grid);floor.material=floorMat;
  for(let i=-10;i<=10;i++){const a=MeshBuilder.CreateBox('gx'+i,{width:24,height:.012,depth:.012},scene);a.position.set(0,.01,i*.7);a.material=gridMat;const b=MeshBuilder.CreateBox('gz'+i,{width:.012,height:.012,depth:24},scene);b.position.set(i*.7,.01,0);b.material=gridMat}
  const lamps:Partial<Record<Phase,StandardMaterial>>={}, moving:Array<{mesh:import('@babylonjs/core').Mesh; axis:'x'|'y'|'z'; home:number}>=[];
  if(kind==='traffic'){
   const body=MeshBuilder.CreateBox('housing',{width:1.5,height:3.8,depth:.72},scene);body.position.y=2.25;body.material=dark;
   const pole=MeshBuilder.CreateCylinder('pole',{height:2.4,diameter:.16},scene);pole.position.y=.25;pole.material=metal;
   phases.forEach((p,i)=>{const y=3.45-i*1.2;const bezel=MeshBuilder.CreateCylinder('bezel'+p,{diameter:.82,height:.14},scene);bezel.rotation.x=Math.PI/2;bezel.position.set(0,y,.43);bezel.material=metal;const m=material('lamp'+p,colors[p]);lamps[p]=m;const sphere=MeshBuilder.CreateSphere('lampSphere'+p,{diameter:.56,segments:32},scene);sphere.position.set(0,y,.53);sphere.material=m});
  }else if(kind==='robot'){
   const base=MeshBuilder.CreateCylinder('robotBase',{diameter:1.8,height:.4},scene);base.position.y=.3;base.material=metal;
   const turn=MeshBuilder.CreateCylinder('turntable',{diameter:1.1,height:.3},scene);turn.position.y=.65;turn.material=cyan;moving.push({mesh:turn,axis:'y',home:0});
   const arm=MeshBuilder.CreateBox('upperArm',{width:.42,height:2,depth:.42},scene);arm.position.set(.45,1.9,0);arm.rotation.z=-.35;arm.material=orange;moving.push({mesh:arm,axis:'z',home:-.35});
   const fore=MeshBuilder.CreateBox('forearm',{width:.32,height:1.5,depth:.32},scene);fore.position.set(1.1,2.7,0);fore.rotation.z=.55;fore.material=cyan;moving.push({mesh:fore,axis:'z',home:.55});
   const claw=MeshBuilder.CreateBox('gripper',{width:.7,height:.15,depth:.3},scene);claw.position.set(1.65,3.35,0);claw.material=orange;
  }else if(kind==='conveyor'){
   const belt=MeshBuilder.CreateBox('belt',{width:7,height:.22,depth:1.5},scene);belt.position.y=.8;belt.material=dark;
   [-2.7,2.7].forEach(x=>[-.5,.5].forEach(z=>{const leg=MeshBuilder.CreateBox('leg',{width:.15,height:1.5,depth:.15},scene);leg.position.set(x,.1,z);leg.material=metal}));
   for(let i=0;i<5;i++){const box=MeshBuilder.CreateBox('package'+i,{size:.65},scene);box.position.set(-2.5+i*1.25,1.25,0);box.material=i%2?cyan:orange;moving.push({mesh:box,axis:'x',home:box.position.x})}
  }else{
   for(let r=0;r<3;r++)for(let c=0;c<4;c++){const panel=MeshBuilder.CreateBox('solar'+r+c,{width:1.35,height:.12,depth:1.7},scene);panel.position.set((c-1.5)*1.65,1,(r-1)*2.15);panel.rotation.x=-.25;panel.material=cyan;const frame=MeshBuilder.CreateBox('frame'+r+c,{width:1.43,height:.16,depth:1.78},scene);frame.position.copyFrom(panel.position);frame.rotation.x=-.25;frame.material=metal}
  }
  let t=0,lastTheme=theme;
  scene.onBeforeRenderObservable.add(()=>{t+=engine.getDeltaTime()/1000;phases.forEach(p=>{const m=lamps[p];if(m){m.emissiveColor=p===phaseRef.current?colors[p].scale(.85):new Color3(.01,.015,.02);m.diffuseColor=p===phaseRef.current?colors[p]:colors[p].scale(.08)}});
   if(runRef.current)moving.forEach((o,i)=>{if(o.axis==='y')o.mesh.rotation.y=Math.sin(t*1.4+i)*.6;else if(o.axis==='z')o.mesh.rotation.z=o.home+Math.sin(t*1.4+i)*.25;else o.mesh.position.x=o.home+Math.sin(t*1.2+i)*.35});
   if(themeRef.current!==lastTheme){lastTheme=themeRef.current;const p=themes[lastTheme];scene.clearColor=p.bg;floorMat.diffuseColor=p.floor;gridMat.diffuseColor=p.grid;light.intensity=p.light}
  });
  scene.clearColor=themes[theme].bg;engine.runRenderLoop(()=>scene.render());const resize=()=>engine.resize();window.addEventListener('resize',resize);
  return()=>{window.removeEventListener('resize',resize);scene.dispose();engine.dispose()};
 },[]);
 return <canvas className="scene-canvas" ref={canvas} aria-label="Interactive 3D system model; drag to rotate and scroll to zoom"/>;
}

export default function App(){
 const [systems,setSystems]=useState<SystemItem[]>([{id:1,name:'Traffic controller',kind:'traffic'}]),[activeId,setActiveId]=useState(1);
 const [newName,setNewName]=useState(''),[newKind,setNewKind]=useState<Kind>('robot'),[theme,setTheme]=useState<Theme>('lab');
 const [phase,setPhase]=useState<Phase>('GREEN'),[running,setRunning]=useState(false),[speed,setSpeed]=useState(1),[elapsed,setElapsed]=useState(0),[count,setCount]=useState(0),[learn,setLearn]=useState(false);
 const [logs,setLogs]=useState<Array<{id:number;phase:Phase;message:string}>>([{id:1,phase:'GREEN',message:'System initialized.'}]);const id=useRef(2);
 const active=systems.find(s=>s.id===activeId)??systems[0];
 const advance=()=>{setPhase(p=>{const next=phases[(phases.indexOf(p)+1)%3];setElapsed(v=>v+5);setCount(v=>v+1);setLogs(v=>[{id:id.current++,phase:next,message:p+' → '+next+' transition'},...v].slice(0,8));return next})};
 useEffect(()=>{if(!running)return;const timer=window.setInterval(advance,3000/speed);return()=>window.clearInterval(timer)},[running,speed]);
 const reset=()=>{setRunning(false);setPhase('GREEN');setElapsed(0);setCount(0);setLogs([{id:id.current++,phase:'GREEN',message:'Simulation reset.'}])};
 const create=()=>{const item={id:Date.now(),name:newName.trim()||labels[newKind],kind:newKind};setSystems(v=>[...v,item]);setActiveId(item.id);setNewName('');reset()};
 const select=(s:SystemItem)=>{setActiveId(s.id);reset();setLogs([{id:id.current++,phase:'GREEN',message:s.name+' loaded.'}])};
 return <main className="app-shell">
  <header className="topbar"><a className="brand" href="#"><span className="brand-mark">S<span>↗</span></span><span>STATECRAFT<small>BY AD3N1X</small></span></a><div className="topbar-right"><span className="engine-status"><i/> BABYLON.JS ENGINE</span><button className="learn-button" onClick={()=>setLearn(v=>!v)}>ⓘ How it works</button></div></header>
  <section className="hero"><div><div className="eyebrow"><span/> INTERACTIVE SYSTEMS STUDIO</div><h1>Build a system.<br/><em>Bring it to life.</em></h1><p>Create systems, inspect their 3D models, change the environment, and run a simulation.</p></div><div className="hero-tag"><span>WORKBENCH / 3D</span><strong>{active.name.toUpperCase()}</strong><small>{labels[active.kind].toUpperCase()}</small></div></section>
  <section className="builder panel"><div className="builder-heading"><div><span className="eyebrow">01 / SYSTEM BUILDER</span><h2>Create your own system</h2><p>Choose a model, name it, then open it in the 3D workbench.</p></div><span className="builder-count">{systems.length} SYSTEM{systems.length===1?'':'S'}</span></div>
   <div className="builder-form"><label><span>SYSTEM NAME</span><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Factory arm 01" maxLength={32}/></label><label><span>SYSTEM TYPE</span><select value={newKind} onChange={e=>setNewKind(e.target.value as Kind)}><option value="traffic">Traffic controller</option><option value="robot">Robotic arm</option><option value="conveyor">Conveyor line</option><option value="solar">Solar array</option></select></label><button className="create-button" onClick={create}>＋ Create system</button></div>
   <div className="system-shelf">{systems.map(s=><button key={s.id} className={s.id===activeId?'system-tab selected':'system-tab'} onClick={()=>select(s)}><span className="system-tab-icon">{s.kind==='traffic'?'◉':s.kind==='robot'?'⌘':s.kind==='conveyor'?'▤':'▦'}</span><span><strong>{s.name}</strong><small>{labels[s.kind]}</small></span><span className="tab-arrow">↗</span></button>)}</div>
  </section>
  <section className="environment-bar panel"><div><span className="eyebrow">02 / ENVIRONMENT</span><strong>Change the world around your model</strong></div><div className="environment-options">{(['lab','midnight','sunset','clean'] as Theme[]).map(t=><button key={t} className={theme===t?'environment-choice active':'environment-choice'} onClick={()=>setTheme(t)}><span className={'environment-swatch '+t}/>{({lab:'Neon lab',midnight:'Midnight',sunset:'Sunset',clean:'Clean studio'})[t]}</button>)}</div></section>
  <section className="workspace"><div className="scene-panel"><div className="panel-head"><div><span className="live-dot"/> 3D WORKSPACE</div><span className="panel-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span></div><SystemScene kind={active.kind} theme={theme} phase={phase} running={running}/><div className="scene-overlay"><span>LIVE SCENE / {active.id.toString().slice(-3)}</span><span>WEBGL · BABYLON.JS</span></div><div className="state-chip"><span className={'lamp-dot '+phase.toLowerCase()}/><div><small>CONTROLLER PHASE</small><strong>{phase}</strong></div></div><div className="scene-controls"><button className={running?'control primary active':'control primary'} onClick={()=>setRunning(v=>!v)}>{running?'Ⅱ Pause':'▶ Run simulation'}</button><button className="control" onClick={advance} disabled={running}>↦ Step</button><button className="control" onClick={reset}>↺ Reset</button></div></div>
   <aside className="side-column"><div className="panel metrics-panel"><div className="panel-head"><span>TELEMETRY</span><span className="tiny-label">LIVE DATA</span></div><div className="metric-grid"><div><small>SIM TIME</small><strong>{String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}<small> MM:SS</small></strong></div><div><small>TRANSITIONS</small><strong>{String(count).padStart(2,'0')}</strong></div></div><div className="progress-track"><span style={{width:((phases.indexOf(phase)+1)/3)*100+'%'}}/></div><div className="phase-row"><span>PHASE PROGRESS</span><span>{phases.indexOf(phase)+1} / 3</span></div><label className="speed-control"><span>SIMULATION SPEED</span><strong>{speed.toFixed(1)}×</strong><input type="range" min=".5" max="2" step=".5" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label></div>
   <div className="panel state-panel"><div className="panel-head"><span>STATE INSPECTOR</span><span className="tiny-label">CURRENT</span></div><div className="state-name"><span className={'lamp-dot '+phase.toLowerCase()}/><strong>{phase}</strong><span className="state-index">S{phases.indexOf(phase)+1}</span></div><p>{phase==='RED'?'Hold — the controller is stopping movement.':phase==='YELLOW'?'Transition — the controller is changing phase.':'Active — the controller permits movement.'}</p><div className="rule-box"><span>TRANSITION RULE</span><code>GREEN → YELLOW → RED</code><small>Current demo rule. Custom rule editing is a future extension.</small></div></div>
   <div className="panel timeline-panel"><div className="panel-head"><span>EVENT TIMELINE</span><span className="tiny-label">{logs.length} EVENTS</span></div><div className="timeline">{logs.map(l=><div className="timeline-item" key={l.id}><span className={'timeline-node '+l.phase.toLowerCase()}/><div><div className="timeline-meta"><strong>{l.phase}</strong></div><p>{l.message}</p></div></div>)}</div></div></aside></section>
  {learn&&<section className="learn-panel"><button className="close-learn" onClick={()=>setLearn(false)}>×</button><div className="eyebrow">FIELD NOTES / 001</div><h2>How Statecraft works</h2><p><strong>React</strong> powers the builder and controls. <strong>Babylon.js</strong> creates the 3D models, camera, lighting, and background. The current phase logic is a prototype, not a connection to real hardware.</p><div className="learn-grid"><div><span>01 / BUILD</span><strong>Choose a model</strong><p>Traffic lights, a robotic arm, conveyor line, or solar array.</p></div><div><span>02 / ENVIRONMENT</span><strong>Set the scene</strong><p>Change background, floor, grid, and lighting presets.</p></div><div><span>03 / SIMULATE</span><strong>Run and inspect</strong><p>Start, pause, step through phases, and reset the simulation.</p></div></div></section>}
  <footer><span>STATECRAFT <i>BUILD 0.2.0</i></span><span>DESIGNED TO EXPLORE SYSTEMS <b>◆</b></span></footer>
 </main>
}
