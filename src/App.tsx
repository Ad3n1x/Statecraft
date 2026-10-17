import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArcRotateCamera, Color3, Color4, Engine, HemisphericLight, MeshBuilder,
  Scene, StandardMaterial, Vector3,
} from '@babylonjs/core';

type LightState = 'RED' | 'GREEN' | 'YELLOW';
type LogItem = { id: number; time: string; state: LightState; message: string };

const sequence: LightState[] = ['GREEN', 'YELLOW', 'RED'];
const lampColors: Record<LightState, Color3> = {
  RED: new Color3(1, 0.13, 0.16),
  YELLOW: new Color3(1, 0.67, 0.12),
  GREEN: new Color3(0.18, 0.92, 0.55),
};
const descriptions: Record<LightState, string> = {
  RED: 'Stop — the controller is holding traffic.',
  YELLOW: 'Prepare — the controller is changing phase.',
  GREEN: 'Go — the controller permits movement.',
};

function TrafficScene({ state }: { state: LightState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const lampRefs = useRef<Partial<Record<LightState, StandardMaterial>>>({});
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: Engine;
    try {
      engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true });
    } catch {
      return;
    }
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.035, 0.055, 0.08, 1);
    const camera = new ArcRotateCamera('camera', -Math.PI / 2.1, Math.PI / 2.55, 8, new Vector3(0, 1.5, 0), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 12;
    camera.wheelPrecision = 45;
    new HemisphericLight('ambient', new Vector3(0, 1, 0), scene).intensity = 0.9;
    const key = new HemisphericLight('rim', new Vector3(-1, 0.5, -1), scene);
    key.intensity = 0.45;

    const housingMat = new StandardMaterial('housing', scene);
    housingMat.diffuseColor = new Color3(0.075, 0.105, 0.15);
    housingMat.specularColor = new Color3(0.22, 0.28, 0.36);
    const body = MeshBuilder.CreateBox('traffic-light-housing', { width: 1.45, height: 3.8, depth: 0.72 }, scene);
    body.position.y = 1.75;
    body.material = housingMat;
    const poleMat = new StandardMaterial('pole', scene);
    poleMat.diffuseColor = new Color3(0.16, 0.2, 0.25);
    const pole = MeshBuilder.CreateCylinder('pole', { height: 2.5, diameter: 0.16, tessellation: 24 }, scene);
    pole.position.y = -1.35;
    pole.material = poleMat;
    const base = MeshBuilder.CreateCylinder('base', { height: 0.12, diameter: 1.2, tessellation: 32 }, scene);
    base.position.y = -2.58;
    base.material = poleMat;

    (['RED', 'YELLOW', 'GREEN'] as LightState[]).forEach((lampState, index) => {
      const y = 2.95 - index * 1.2;
      const bezelMat = new StandardMaterial('bezel-' + lampState, scene);
      bezelMat.diffuseColor = new Color3(0.018, 0.025, 0.035);
      const bezel = MeshBuilder.CreateCylinder('bezel-' + lampState, { diameter: 0.78, height: 0.12, tessellation: 48 }, scene);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(0, y, 0.42);
      bezel.material = bezelMat;
      const lampMat = new StandardMaterial('lamp-' + lampState, scene);
      lampMat.diffuseColor = lampColors[lampState].scale(0.12);
      lampMat.emissiveColor = new Color3(0.025, 0.035, 0.045);
      lampMat.specularColor = new Color3(0.25, 0.25, 0.25);
      lampRefs.current[lampState] = lampMat;
      const lamp = MeshBuilder.CreateSphere('lamp-' + lampState, { diameter: 0.56, segments: 32 }, scene);
      lamp.position.set(0, y, 0.52);
      lamp.material = lampMat;
    });
    const floorMat = new StandardMaterial('floor', scene);
    floorMat.diffuseColor = new Color3(0.045, 0.07, 0.095);
    const floor = MeshBuilder.CreateGround('ground', { width: 18, height: 18 }, scene);
    floor.position.y = -2.66;
    floor.material = floorMat;
    const gridMat = new StandardMaterial('grid', scene);
    gridMat.diffuseColor = new Color3(0.08, 0.15, 0.19);
    for (let i = -4; i <= 4; i++) {
      const lineA = MeshBuilder.CreateBox('grid-x-' + i, { width: 18, height: 0.008, depth: 0.008 }, scene);
      lineA.position.set(0, -2.65, i * 1.4); lineA.material = gridMat;
      const lineB = MeshBuilder.CreateBox('grid-z-' + i, { width: 0.008, height: 0.008, depth: 18 }, scene);
      lineB.position.set(i * 1.4, -2.65, 0); lineB.material = gridMat;
    }

    const updateLamps = () => {
      const active = stateRef.current;
      (['RED', 'YELLOW', 'GREEN'] as LightState[]).forEach((lampState) => {
        const mat = lampRefs.current[lampState];
        if (!mat) return;
        const on = lampState === active;
        mat.emissiveColor = on ? lampColors[lampState].scale(0.85) : new Color3(0.018, 0.022, 0.028);
        mat.diffuseColor = on ? lampColors[lampState] : lampColors[lampState].scale(0.09);
      });
    };
    scene.onBeforeRenderObservable.add(updateLamps);
    engine.runRenderLoop(() => scene.render());
    const resize = () => engine.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      scene.dispose();
      engine.dispose();
      lampRefs.current = {};
    };
  }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  return <canvas className="scene-canvas" ref={canvasRef} aria-label="Interactive 3D traffic light. Drag to rotate and scroll to zoom." />;
}

export default function App() {
  const [state, setState] = useState<LightState>('GREEN');
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(0);
  const [logs, setLogs] = useState<LogItem[]>([{ id: 1, time: '00:00', state: 'GREEN', message: 'Simulation initialized in GREEN state.' }]);
  const [learnOpen, setLearnOpen] = useState(false);
  const tick = useRef(0);
  const nextId = useRef(2);

  const step = useCallback(() => {
    setState((current) => {
      const next = sequence[(sequence.indexOf(current) + 1) % sequence.length];
      tick.current += 1;
      setElapsed((value) => value + 5);
      setCount((value) => value + 1);
      const stamp = new Date((tick.current * 5) * 1000).toISOString().slice(14, 19);
      setLogs((items) => [{ id: nextId.current++, time: stamp, state: next, message: `Timer event: transition ${current} → ${next}.` }, ...items].slice(0, 12));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => step(), 3000 / speed);
    return () => window.clearInterval(timer);
  }, [running, speed, step]);

  const reset = () => {
    setRunning(false); setState('GREEN'); setElapsed(0); setCount(0); tick.current = 0; nextId.current = 2;
    setLogs([{ id: 1, time: '00:00', state: 'GREEN', message: 'Simulation reset to initial GREEN state.' }]);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Statecraft home"><span className="brand-mark">S<span>↗</span></span><span>STATECRAFT<small>BY AD3N1X</small></span></a>
        <div className="topbar-right"><span className="engine-status"><i /> BABYLON.JS ENGINE</span><button className="learn-button" onClick={() => setLearnOpen((v) => !v)}>ⓘ Learn</button></div>
      </header>
      <section className="hero">
        <div><div className="eyebrow"><span /> SYSTEM LAB / 001</div><h1>Model it. Run it.<br /><em>Understand it.</em></h1><p>Explore the logic behind a system — one state transition at a time.</p></div>
        <div className="hero-tag"><span>SIMULATION</span><strong>TRAFFIC CONTROL</strong><small>DETERMINISTIC STATE MACHINE</small></div>
      </section>
      <section className="workspace">
        <div className="scene-panel">
          <div className="panel-head"><div><span className="live-dot" /> 3D ENVIRONMENT</div><span className="panel-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span></div>
          <TrafficScene state={state} />
          <div className="scene-overlay"><span>SCENE 01</span><span>WEBGL / REAL-TIME</span></div>
          <div className="state-chip"><span className={`lamp-dot ${state.toLowerCase()}`} /><div><small>ACTIVE STATE</small><strong>{state}</strong></div></div>
          <div className="scene-controls"><button className={running ? 'control primary active' : 'control primary'} onClick={() => setRunning((v) => !v)}>{running ? 'Ⅱ Pause' : '▶ Run'}</button><button className="control" onClick={step} disabled={running}>↦ Step</button><button className="control" onClick={reset}>↺ Reset</button></div>
        </div>
        <aside className="side-column">
          <div className="panel metrics-panel"><div className="panel-head"><span>TELEMETRY</span><span className="tiny-label">LIVE DATA</span></div><div className="metric-grid"><div><small>SIM TIME</small><strong>{String(Math.floor(elapsed / 60)).padStart(2,'0')}:{String(elapsed % 60).padStart(2,'0')}<small> MM:SS</small></strong></div><div><small>TRANSITIONS</small><strong>{String(count).padStart(2,'0')}</strong></div></div><div className="progress-track"><span style={{width: `${((sequence.indexOf(state)+1)/3)*100}%`}} /></div><div className="phase-row"><span>PHASE PROGRESS</span><span>{sequence.indexOf(state)+1} / 3</span></div><label className="speed-control"><span>SIMULATION SPEED</span><strong>{speed.toFixed(1)}×</strong><input type="range" min="0.5" max="2" step="0.5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></label></div>
          <div className="panel state-panel"><div className="panel-head"><span>STATE INSPECTOR</span><span className="tiny-label">CURRENT</span></div><div className="state-name"><span className={`lamp-dot ${state.toLowerCase()}`} /><strong>{state}</strong><span className="state-index">S{sequence.indexOf(state)+1}</span></div><p>{descriptions[state]}</p><div className="rule-box"><span>TRANSITION RULE</span><code>timer.elapsed ≥ 5s</code><small>When the timer condition is met, advance to the next configured state.</small></div></div>
          <div className="panel timeline-panel"><div className="panel-head"><span>EVENT TIMELINE</span><span className="tiny-label">{logs.length} EVENTS</span></div><div className="timeline">{logs.map((item) => <div className="timeline-item" key={item.id}><span className={`timeline-node ${item.state.toLowerCase()}`} /><div><div className="timeline-meta"><strong>{item.state}</strong><time>{item.time}</time></div><p>{item.message}</p></div></div>)}</div></div>
        </aside>
      </section>
      {learnOpen && <section className="learn-panel"><button className="close-learn" onClick={() => setLearnOpen(false)}>×</button><div className="eyebrow">FIELD NOTES / 001</div><h2>What is Babylon.js?</h2><p><strong>Babylon.js</strong> is a 3D engine for the web. It creates the scene, models, materials, lights, camera, and rendered frames you see above.</p><div className="learn-grid"><div><span>01 / INTERFACE</span><strong>React</strong><p>Builds buttons, panels, controls, and updates the screen when data changes.</p></div><div><span>02 / 3D WORLD</span><strong>Babylon.js</strong><p>Draws and animates the traffic light in a WebGL-powered canvas.</p></div><div><span>03 / BEHAVIOUR</span><strong>Simulation logic</strong><p>Chooses the next state and records transitions. Rendering shows the result; it does not decide the rules.</p></div></div><p className="learning-note">Try pressing Step. The controller advances GREEN → YELLOW → RED. Drag the 3D view to orbit the camera, or scroll to zoom.</p></section>}
      <footer><span>STATECRAFT <i>BUILD 0.1.0</i></span><span>BUILT TO EXPLORE SYSTEMS <b>◆</b></span></footer>
    </main>
  );
}
