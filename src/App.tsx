import { useEffect, useRef, useState } from 'react';
import {
  ArcRotateCamera, Color3, Color4, Engine, HemisphericLight, MeshBuilder,
  Scene, StandardMaterial, Vector3,
} from '@babylonjs/core';

type LightState = 'RED' | 'GREEN' | 'YELLOW';
type SystemKind = 'traffic' | 'robot' | 'conveyor' | 'solar';
type Environment = 'lab' | 'midnight' | 'sunset' | 'clean';
type SystemItem = { id: number; name: string; kind: SystemKind };
type LogItem = { id: number; time: string; state: LightState; message: string };

const sequence: LightState[] = ['GREEN', 'YELLOW', 'RED'];
const lampColors: Record<LightState, Color3> = {
  RED: new Color3(1, 0.13, 0.16), YELLOW: new Color3(1, 0.67, 0.12), GREEN: new Color3(0.18, 0.92, 0.55),
};
const descriptions: Record<LightState, string> = {
  RED: 'Stop — the controller is holding the system.', YELLOW: 'Transition — the controller is changing phase.', GREEN: 'Active — the system is permitting movement.',
};
const kindLabels: Record<SystemKind, string> = { traffic: 'Traffic controller', robot: 'Robotic arm', conveyor: 'Conveyor line', solar: 'Solar array' };
const envLabels: Record<Environment, string> = { lab: 'Neon lab', midnight: 'Midnight', sunset: 'Sunset', clean: 'Clean studio' };

function TrafficScene({ kind, environment, state, running }: { kind: SystemKind; environment: Environment; state: LightState; running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const runningRef = useRef(running);
  const kindRef = useRef(kind);
  const envRef = useRef(environment);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { kindRef.current = kind; }, [kind]);
  useEffect(() => { envRef.current = environment; }, [environment]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: Engine;
    try { engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true }); }
    catch { return; }
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera('camera', -Math.PI / 2.15, Math.PI / 2.7, 9, new Vector3(0, 0.8, 0), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 4; camera.upperRadiusLimit = 18; camera.wheelPrecision = 40;
    const ambient = new HemisphericLight('ambient', new Vector3(0.2, 1, 0.1), scene);
    ambient.intensity = 0.95;
    const rim = new HemisphericLight('rim', new Vector3(-1, 0.5, -1), scene);
    rim.intensity = 0.5;

    const mat = (name: string, color: Color3, emissive = new Color3(0, 0, 0)) => {
      const m = new StandardMaterial(name, scene); m.diffuseColor = color; m.emissiveColor = emissive; m.specularColor = new Color3(0.35, 0.4, 0.48); return m;
    };
    const metal = mat('brushed-metal', new Color3(0.19, 0.25, 0.31));
    const dark = mat('graphite', new Color3(0.035, 0.055, 0.075));
    const cyan = mat('signal-cyan', new Color3(0.1, 0.75, 0.8), new Color3(0.02, 0.25, 0.3));
    const amber = mat('signal-amber', new Color3(1, 0.55, 0.15), new Color3(0.2, 0.07, 0.01));
    const ground = MeshBuilder.CreateGround('floor', { width: 24, height: 24 }, scene);
    const groundMat = mat('floor-material', new Color3(0.045, 0.07, 0.09)); ground.material = groundMat;
    const gridMat = mat('floor-grid', new Color3(0.06, 0.14, 0.17), new Color3(0.015, 0.04, 0.05));
    for (let i = -8; i <= 8; i++) {
      const a = MeshBuilder.CreateBox('grid-x-' + i, { width: 24, height: 0.012, depth: 0.012 }, scene);
      a.position.set(0, 0.012, i * 0.75); a.material = gridMat;
      const b = MeshBuilder.CreateBox('grid-z-' + i, { width: 0.012, height: 0.012, depth: 24 }, scene);
      b.position.set(i * 0.75, 0.012, 0); b.material = gridMat;
    }
    const moving: Array<{ mesh: import('@babylonjs/core').Mesh; axis: 'x' | 'y' | 'z'; amount: number }> = [];
    const lampMats: Partial<Record<LightState, StandardMaterial>> = {};

    if (kind === 'traffic') {
      const body = MeshBuilder.CreateBox('controller-housing', { width: 1.5, height: 3.8, depth: 0.72 }, scene);
      body.position.y = 2.35; body.material = dark;
      const pole = MeshBuilder.CreateCylinder('support-pole', { height: 2.3, diameter: 0.16 }, scene);
      pole.position.y = 0.35; pole.material = metal;
      (['RED', 'YELLOW', 'GREEN'] as LightState[]).forEach((s, i) => {
        const y = 3.55 - i * 1.2;
        const bezel = MeshBuilder.CreateCylinder('bezel-' + s, { diameter: 0.82, height: 0.14, tessellation: 48 }, scene);
        bezel.rotation.x = Math.PI / 2; bezel.position.set(0, y, 0.43); bezel.material = metal;
        const m = mat('lamp-' + s, lampColors[s].scale(0.1)); lampMats[s] = m;
        const lamp = MeshBuilder.CreateSphere('lamp-' + s, { diameter: 0.57, segments: 32 }, scene);
        lamp.position.set(0, y, 0.53); lamp.material = m;
      });
    } else if (kind === 'robot') {
      const base = MeshBuilder.CreateCylinder('robot-base', { diameter: 1.8, height: 0.45, tessellation: 48 }, scene);
      base.position.y = 0.3; base.material = metal;
      const turntable = MeshBuilder.CreateCylinder('robot-turntable', { diameter: 1.1, height: 0.35 }, scene);
      turntable.position.y = 0.68; turntable.material = cyan; moving.push({ mesh: turntable, axis: 'y', amount: 0.7 });
      const shoulder = MeshBuilder.CreateSphere('robot-shoulder', { diameter: 0.62 }, scene);
      shoulder.position.set(0, 1.25, 0); shoulder.material = amber;
      const arm = MeshBuilder.CreateBox('robot-upper-arm', { width: 0.42, height: 2.05, depth: 0.42 }, scene);
      arm.position.set(0.48, 2.05, 0); arm.rotation.z = -0.35; arm.material = metal; moving.push({ mesh: arm, axis: 'z', amount: 0.3 });
      const forearm = MeshBuilder.CreateBox('robot-forearm', { width: 0.34, height: 1.55, depth: 0.34 }, scene);
      forearm.position.set(1.15, 2.8, 0); forearm.rotation.z = 0.6; forearm.material = cyan; moving.push({ mesh: forearm, axis: 'z', amount: 0.4 });
      const claw = MeshBuilder.CreateBox('robot-gripper', { width: 0.75, height: 0.16, depth: 0.32 }, scene);
      claw.position.set(1.75, 3.4, 0); claw.material = amber;
    } else if (kind === 'conveyor') {
      const belt = MeshBuilder.CreateBox('conveyor-belt', { width: 7, height: 0.25, depth: 1.5 }, scene);
      belt.position.y = 0.85; belt.material = dark;
      [-3.1, 3.1].forEach((x) => { const roller = MeshBuilder.CreateCylinder('roller', { diameter: 0.6, height: 1.7, rotation: Math.PI / 2 }, scene); roller.position.set(x, 0.85, 0); roller.material = metal; moving.push({ mesh: roller, axis: 'x', amount: 0.7 }); });
      for (let i = 0; i < 5; i++) {
        const box = MeshBuilder.CreateBox('cargo-' + i, { size: 0.68 }, scene);
        box.position.set(-2.6 + i * 1.3, 1.35, 0); box.material = i % 2 ? cyan : amber;
        moving.push({ mesh: box, axis: 'x', amount: 1.4 });
      }
      const legMat = metal;
      [-2.7, 2.7].forEach((x) => [-0.5, 0.5].forEach((z) => { const leg = MeshBuilder.CreateBox('conveyor-leg', { width: 0.18, height: 1.5, depth: 0.18 }, scene); leg.position.set(x, 0.1, z); leg.material = legMat; }));
    } else {
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
        const panel = MeshBuilder.CreateBox('solar-panel-' + row + '-' + col, { width: 1.35, height: 0.12, depth: 1.7 }, scene);
        panel.position.set((col - 1.5) * 1.65, 1 + (row % 2) * 0.15, (row - 1) * 2.15);
        panel.rotation.x = -0.25; panel.material = cyan;
        const frame = MeshBuilder.CreateBox('solar-frame-' + row + '-' + col, { width: 1.42, height: 0.16, depth: 1.78 }, scene);
        frame.position.copyFrom(panel.position); frame.rotation.x = -0.25; frame.material = metal;
      }
    }

    const applyEnvironment = () => {
      const env = envRef.current;
      const presets: Record<Environment, { bg: Color4; floor: Color3; grid: Color3; intensity: number }> = {
        lab: { bg: new Color4(0.025, 0.045, 0.07, 1), floor: new Color3(0.045, 0.07, 0.09), grid: new Color3(0.06, 0.14, 0.17), intensity: 0.95 },
        midnight: { bg: new Color4(0.008, 0.012, 0.035, 1), floor: new Color3(0.018, 0.024, 0.055), grid: new Color3(0.08, 0.09, 0.24), intensity: 0.65 },
        sunset: { bg: new Color4(0.12, 0.045, 0.04, 1), floor: new Color3(0.13, 0.065, 0.055), grid: new Color3(0.28, 0.12, 0.08), intensity: 1.05 },
        clean: { bg: new Color4(0.72, 0.79, 0.82, 1), floor: new Color3(0.56, 0.63, 0.66), grid: new Color3(0.39, 0.49, 0.53), intensity: 1.15 },
      };
      const p = presets[env]; scene.clearColor = p.bg; groundMat.diffuseColor = p.floor; gridMat.diffuseColor = p.grid; ambient.intensity = p.intensity;
    };
    applyEnvironment();
    let frame = 0;
    scene.onBeforeRenderObservable.add(() => {
      frame += engine.getDeltaTime() / 1000;
      const active = stateRef.current;
      (['RED', 'YELLOW', 'GREEN'] as LightState[]).forEach((s) => {
        const m = lampMats[s]; if (!m) return;
        const on = s === active;
        m.emissiveColor = on ? lampColors[s].scale(0.9) : new Color3(0.012, 0.016, 0.022);
        m.diffuseColor = on ? lampColors[s] : lampColors[s].scale(0.08);
      });
      if (runningRef.current) moving.forEach(({ mesh, axis, amount }, index) => {
        const value = Math.sin(frame * amount + index * 0.7) * (kindRef.current === 'conveyor' ? 0.4 : 0.22);
        if (axis === 'x') mesh.position.x += Math.sin(frame * amount) * 0.002;
        else if (axis === 'y') mesh.rotation.y = value * 2;
        else mesh.rotation.z = value;
      });
      if (envRef.current !== lastEnv) { lastEnv = envRef.current; applyEnvironment(); }
    });
    let lastEnv = environment;
    engine.runRenderLoop(() => scene.render());
    const resize = () => engine.resize(); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); scene.dispose(); engine.dispose(); };
  }, []);
  return <canvas className="scene-canvas" ref={canvasRef} aria-label="Interactive 3D system model. Drag to rotate and scroll to zoom." />;
}

export default function App() {
  const [systems, setSystems] = useState<SystemItem[]>([{ id: 1, name: 'Traffic controller', kind: 'traffic' }]);
  const [activeId, setActiveId] = useState(1);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<SystemKind>('robot');
  const [environment, setEnvironment] = useState<Environment>('lab');
  const [state, setState] = useState<LightState>('GREEN');
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(0);
  const [learnOpen, setLearnOpen] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([{ id: 1, time: '00:00', state: 'GREEN', message: 'System initialized in GREEN state.' }]);
  const logId = useRef(2);
  const activeSystem = systems.find((item) => item.id === activeId) ?? systems[0];

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setState((current) => {
        const next = sequence[(sequence.indexOf(current) + 1) % sequence.length];
        setElapsed((value) => value + 5); setCount((value) => value + 1);
        setLogs((items) => [{ id: logId.current++, time: new Date().toISOString().slice(14, 19), state: next, message: 'Automatic phase transition: ' + current + ' → ' + next + '.' }, ...items].slice(0, 10));
        return next;
      });
    }, 3000 / speed);
    return () => window.clearInterval(timer);
  }, [running, speed]);

  const step = () => {
    setState((current) => {
      const next = sequence[(sequence.indexOf(current) + 1) % sequence.length];
      setElapsed((value) => value + 5); setCount((value) => value + 1);
      setLogs((items) => [{ id: logId.current++, time: new Date().toISOString().slice(14, 19), state: next, message: 'Manual step: ' + current + ' → ' + next + '.' }, ...items].slice(0, 10));
      return next;
    });
  };
  const reset = () => { setRunning(false); setState('GREEN'); setElapsed(0); setCount(0); setLogs([{ id: logId.current++, time: '00:00', state: 'GREEN', message: 'Simulation reset.' }]); };
  const createSystem = () => {
    const name = newName.trim() || kindLabels[newKind];
    const item = { id: Date.now(), name, kind: newKind };
    setSystems((items) => [...items, item]); setActiveId(item.id); setNewName(''); setRunning(false); reset();
  };
  const chooseSystem = (item: SystemItem) => { setActiveId(item.id); setRunning(false); setState('GREEN'); setElapsed(0); setCount(0); setLogs([{ id: logId.current++, time: '00:00', state: 'GREEN', message: item.name + ' loaded into the workbench.' }]); };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Statecraft home"><span className="brand-mark">S<span>↗</span></span><span>STATECRAFT<small>BY AD3N1X</small></span></a>
        <div className="topbar-right"><span className="engine-status"><i /> BABYLON.JS ENGINE</span><button className="learn-button" onClick={() => setLearnOpen((v) => !v)}>ⓘ How it works</button></div>
      </header>
      <section className="hero">
        <div><div className="eyebrow"><span /> INTERACTIVE SYSTEMS STUDIO</div><h1>Build a system.<br /><em>Bring it to life.</em></h1><p>Create a system, inspect its 3D model, change its environment, and run a simple simulation.</p></div>
        <div className="hero-tag"><span>WORKBENCH / 3D</span><strong>{activeSystem.name.toUpperCase()}</strong><small>{kindLabels[activeSystem.kind].toUpperCase()}</small></div>
      </section>

      <section className="builder panel">
        <div className="builder-heading"><div><span className="eyebrow">01 / SYSTEM BUILDER</span><h2>Create your own workbench</h2><p>Choose a system type and give it a name. Each system gets its own 3D model.</p></div><span className="builder-count">{systems.length.toString().padStart(2, '0')} SYSTEM{systems.length === 1 ? '' : 'S'}</span></div>
        <div className="builder-form">
          <label><span>SYSTEM NAME</span><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Factory arm 01" maxLength={32} /></label>
          <label><span>SYSTEM TYPE</span><select value={newKind} onChange={(e) => setNewKind(e.target.value as SystemKind)}><option value="traffic">Traffic controller</option><option value="robot">Robotic arm</option><option value="conveyor">Conveyor line</option><option value="solar">Solar array</option></select></label>
          <button className="create-button" onClick={createSystem}>＋ Create system</button>
        </div>
        <div className="system-shelf">{systems.map((item) => <button key={item.id} className={item.id === activeId ? 'system-tab selected' : 'system-tab'} onClick={() => chooseSystem(item)}><span className="system-tab-icon">{item.kind === 'traffic' ? '◉' : item.kind === 'robot' ? '⌘' : item.kind === 'conveyor' ? '▤' : '▦'}</span><span><strong>{item.name}</strong><small>{kindLabels[item.kind]}</small></span><span className="tab-arrow">↗</span></button>)}</div>
      </section>

      <section className="environment-bar panel">
        <div><span className="eyebrow">02 / ENVIRONMENT</span><strong>Change the world around your model</strong></div>
        <div className="environment-options">{(['lab', 'midnight', 'sunset', 'clean'] as Environment[]).map((env) => <button key={env} onClick={() => setEnvironment(env)} className={environment === env ? 'environment-choice active' : 'environment-choice'}><span className={'environment-swatch ' + env} />{envLabels[env]}</button>)}</div>
      </section>

      <section className="workspace">
        <div className="scene-panel">
          <div className="panel-head"><div><span className="live-dot" /> 3D WORKSPACE</div><span className="panel-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span></div>
          <TrafficScene kind={activeSystem.kind} environment={environment} state={state} running={running} />
          <div className="scene-overlay"><span>LIVE SCENE / {activeSystem.id.toString().padStart(3, '0')}</span><span>WEBGL · BABYLON.JS</span></div>
          <div className="state-chip"><span className={'lamp-dot ' + state.toLowerCase()} /><div><small>CONTROLLER PHASE</small><strong>{state}</strong></div></div>
          <div className="scene-controls"><button className={running ? 'control primary active' : 'control primary'} onClick={() => setRunning((v) => !v)}>{running ? 'Ⅱ Pause' : '▶ Run simulation'}</button><button className="control" onClick={step} disabled={running}>↦ Step</button><button className="control" onClick={reset}>↺ Reset</button></div>
        </div>
        <aside className="side-column">
          <div className="panel metrics-panel"><div className="panel-head"><span>TELEMETRY</span><span className="tiny-label">LIVE DATA</span></div><div className="metric-grid"><div><small>SIM TIME</small><strong>{String(Math.floor(elapsed / 60)).padStart(2,'0')}:{String(elapsed % 60).padStart(2,'0')}<small> MM:SS</small></strong></div><div><small>TRANSITIONS</small><strong>{String(count).padStart(2,'0')}</strong></div></div><div className="progress-track"><span style={{width: ((sequence.indexOf(state)+1)/3)*100 + '%'}} /></div><div className="phase-row"><span>PHASE PROGRESS</span><span>{sequence.indexOf(state)+1} / 3</span></div><label className="speed-control"><span>SIMULATION SPEED</span><strong>{speed.toFixed(1)}×</strong><input type="range" min="0.5" max="2" step="0.5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></label></div>
          <div className="panel state-panel"><div className="panel-head"><span>STATE INSPECTOR</span><span className="tiny-label">CURRENT</span></div><div className="state-name"><span className={'lamp-dot ' + state.toLowerCase()} /><strong>{state}</strong><span className="state-index">S{sequence.indexOf(state)+1}</span></div><p>{descriptions[state]}</p><div className="rule-box"><span>TRANSITION RULE</span><code>timer.elapsed ≥ 5s</code><small>The prototype advances through GREEN → YELLOW → RED. More rule editing can be added next.</small></div></div>
          <div className="panel timeline-panel"><div className="panel-head"><span>EVENT TIMELINE</span><span className="tiny-label">{logs.length} EVENTS</span></div><div className="timeline">{logs.map((item) => <div className="timeline-item" key={item.id}><span className={'timeline-node ' + item.state.toLowerCase()} /><div><div className="timeline-meta"><strong>{item.state}</strong><time>{item.time}</time></div><p>{item.message}</p></div></div>)}</div></div>
        </aside>
      </section>
      {learnOpen && <section className="learn-panel"><button className="close-learn" onClick={() => setLearnOpen(false)}>×</button><div className="eyebrow">FIELD NOTES / 001</div><h2>How Statecraft works</h2><p><strong>React</strong> powers the builder and controls. <strong>Babylon.js</strong> renders the 3D world. The simulation logic controls phases and event logs. These are separate layers, so the models and rules can grow without rebuilding the interface.</p><div className="learn-grid"><div><span>01 / BUILD</span><strong>Pick a system</strong><p>Create traffic, robotics, conveyor, and solar-array scenes from the system builder.</p></div><div><span>02 / ENVIRONMENT</span><strong>Set the mood</strong><p>Swap the background, floor, grid, and lighting presets without changing the model.</p></div><div><span>03 / SIMULATE</span><strong>Run the logic</strong><p>Run, pause, step, and reset the prototype. This is a visual logic simulation, not hardware control.</p></div></div></section>}
      <footer><span>STATECRAFT <i>BUILD 0.2.0</i></span><span>DESIGNED TO EXPLORE SYSTEMS <b>◆</b></span></footer>
    </main>
  );
}
