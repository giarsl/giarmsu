import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { MuseumModel } from '../scene/MuseumModel'
import Player from '../player/Player'

function Ready({onReady}: {onReady: () => void}) {
  useEffect(onReady, [onReady])
  return null
}

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const changed = () => {
      setLocked(document.pointerLockElement === canvas.current)
      setError('')
    }
    const denied = () => setError('Mouse capture unavailable. Click to try again in a desktop browser.')
    document.addEventListener('pointerlockchange', changed)
    document.addEventListener('pointerlockerror', denied)
    return () => {
      document.removeEventListener('pointerlockchange', changed)
      document.removeEventListener('pointerlockerror', denied)
    }
  }, [])
  const enter = () => {
    if (!ready || locked || !canvas.current) return
    try {
      const pending = canvas.current.requestPointerLock()
      pending?.catch(() => setError('Mouse capture unavailable. Click to try again.'))
    } catch { setError('Open in a desktop browser with mouse capture enabled.') }
  }
  return <main>
    <Canvas ref={canvas} dpr={[1, 1.5]} camera={{ fov:75, near:0.06, far:85, position:[0,1.65,13] }}
      gl={{antialias:true}} onClick={enter} fallback={<p>This walkthrough requires WebGL 2.</p>}>
      <Suspense fallback={null}>
        <Physics timeStep={1/60}>
          <hemisphereLight args={['#e5d8c7', '#403831', 0.9]}/>
          <directionalLight position={[3, 9, 5]} color="#ffe1bd" intensity={1.15}/>
          <pointLight position={[0, 7.5, 0]} color="#ffd6a6" intensity={24} distance={20} decay={2}/>
                    <MuseumModel url={`${import.meta.env.BASE_URL}models/hoitruong.glb`} position={[-6.5, 0, 8.7]} boxes={[
            { center: [6.5, -0.08, -8.7], halfExtents: [7.6, 0.12, 15] },
            { center: [-1.15, 4.8, -8.7], halfExtents: [0.15, 4.8, 15] },
            { center: [14.15, 4.8, -8.7], halfExtents: [0.15, 4.8, 15] },
            { center: [6.47, 4.61, -14.475], halfExtents: [7.35, 0.19, 2.925] },
          ]}/>
          <Player/>
          <Ready onReady={() => setReady(true)}/>
        </Physics>
      </Suspense>
    </Canvas>
    <section className={locked ? 'prompt hidden' : 'prompt'} aria-hidden={locked}>
      <button onClick={enter} disabled={!ready || locked}>{ready ? 'Click to explore' : 'Opening auditorium…'}</button>
      <small>{error || 'WASD — Walk　|　Mouse — Look　|　Shift — Faster'}</small>
    </section>
  </main>
}
