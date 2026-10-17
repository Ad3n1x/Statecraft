# Statecraft by AD3N1X

**Model it. Run it. Understand it.**

Statecraft is a browser-based system simulator inspired by engineering ideas such as state machines, transitions, observability, and feedback. The first demo is a 3D traffic-light controller.

## Stack
- React + TypeScript for the interface and simulation controls
- Babylon.js for the interactive 3D scene, camera, materials, lighting, and rendering
- Vite for local development and production builds
- Vercel for hosting and Git-connected deployments

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## How it works

React renders the control panel and tracks UI state. The simulation logic advances through GREEN → YELLOW → RED. Babylon.js renders the traffic light and updates lamp materials to reflect the active state. The 3D scene is interactive: drag to orbit and scroll to zoom.

## Learning notes

- **Scene:** the 3D world that contains the model, lights, and camera.
- **Mesh:** a 3D object, such as the housing, pole, or lamp.
- **Material:** controls an object's surface appearance and emitted light.
- **Camera:** the viewpoint used to explore the scene.
- **State machine:** a model with named states and allowed transitions.

The traffic light is a logic simulation, not a physics simulation. Babylon.js can support physics integrations later if a future scenario needs physical motion or collisions.
