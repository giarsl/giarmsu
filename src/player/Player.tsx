import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { bodyCenter, visitor } from './playerConfig'

const navigationKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'])

function stairFloorHeight(x: number, z: number): number | null {
  // The Blender treads are visual geometry; a height profile keeps the capsule
  // supported continuously instead of colliding with every vertical riser.
  if (Math.abs(x) <= 5.6 && z <= 8.82 && z >= 5.18) {
    return ((8.82 - z) / 3.64) * 0.32
  }
  for (const stairX of [-6.5, 6.5]) {
    if (Math.abs(x - stairX) > 0.72) continue
    if (z <= 6.7 && z >= 1.9) return ((6.7 - z) / 4.8) * 2.4
    if (z < 1.9 && z >= 0.7) return 2.4
    if (z < 0.7 && z >= -4.1) return 2.55 + ((0.7 - z) / 4.8) * 2.25
    if (z < -4.1 && z >= -8) return 4.8
  }
  return null
}

function isSecondFloorDeck(x: number, z: number) {
  return x >= -7.4 && x <= 7.4 && z >= -8.75 && z <= -2.75
}

export default function Player({ touchKeys }: { touchKeys: RefObject<Map<number, string>> }) {
  const { rapier } = useRapier()
  const { camera, gl } = useThree()
  const body = useRef<RapierRigidBody>(null)
  const eye = useRef<Group>(null)
  const input = useRef(new Set<string>())
  const motion = useRef({x: 0, z: 0})
  const onSecondFloor = useRef(false)
  const look = useRef({ yaw: visitor.initialYaw, pitch: 0 })

  useEffect(() => {
    const canvas = gl.domElement
    let touch: { id: number; x: number; y: number } | undefined
    function rotate(dx: number, dy: number) {
      const state = look.current
      state.yaw -= dx * visitor.mouseSensitivity
      state.pitch = Math.max(-visitor.pitchLimit, Math.min(visitor.pitchLimit,
        state.pitch - dy * visitor.mouseSensitivity))
    }
    function onMove(event: MouseEvent) {
      if (document.pointerLockElement === canvas) rotate(event.movementX, event.movementY)
    }
    function startLook(event: PointerEvent) {
      if (event.pointerType !== 'touch' || touch) return
      canvas.setPointerCapture(event.pointerId)
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY }
    }
    function moveLook(event: PointerEvent) {
      if (touch?.id !== event.pointerId) return
      rotate(event.clientX - touch.x, event.clientY - touch.y)
      touch.x = event.clientX
      touch.y = event.clientY
    }
    function endLook(event: PointerEvent) {
      if (touch?.id === event.pointerId) touch = undefined
    }
    const touchEvents = [
      ['pointerdown', startLook],
      ['pointermove', moveLook],
      ['lostpointercapture', endLook],
    ] as const
    for (const [name, handler] of touchEvents) canvas.addEventListener(name, handler)
    function onKeyDown(event: KeyboardEvent) {
      if (document.pointerLockElement !== canvas || !navigationKeys.has(event.code)) return
      event.preventDefault()
      input.current.add(event.code)
    }
    function onKeyUp(event: KeyboardEvent) {
      input.current.delete(event.code)
    }
    function clearInput() {
      input.current.clear()
      touchKeys.current.clear()
      touch = undefined
    }

    document.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearInput)
    document.addEventListener('pointerlockchange', clearInput)
    document.addEventListener('visibilitychange', clearInput)
    return () => {
      for (const [name, handler] of touchEvents) canvas.removeEventListener(name, handler)
      document.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearInput)
      document.removeEventListener('pointerlockchange', clearInput)
      document.removeEventListener('visibilitychange', clearInput)
      clearInput()
    }
  }, [gl, touchKeys])

  useBeforePhysicsStep((world) => {
    if (!body.current) return
    const position = body.current.translation()
    const keys = input.current
    const held = new Set([...keys, ...touchKeys.current.values()])
    const side = Number(held.has('KeyD')) - Number(held.has('KeyA'))
    const forward = Number(held.has('KeyW')) - Number(held.has('KeyS'))
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? visitor.briskSpeed : visitor.walkingSpeed
    const scale = speed / Math.max(1, Math.hypot(side, forward))
    const { yaw } = look.current
    const targetX = (side * Math.cos(yaw) - forward * Math.sin(yaw)) * scale
    const targetZ = (-side * Math.sin(yaw) - forward * Math.cos(yaw)) * scale
    const velocity = motion.current
    const dx = targetX - velocity.x
    const dz = targetZ - velocity.z
    const rate = side || forward ? visitor.acceleration : visitor.deceleration
    const change = Math.min(1, rate * world.timestep / Math.max(1e-6, Math.hypot(dx, dz)))
    velocity.x += dx * change
    velocity.z += dz * change
    const nextX = Math.max(-7.15, Math.min(7.15, position.x + velocity.x * world.timestep))
    const nextZ = Math.max(-9, Math.min(14, position.z + velocity.z * world.timestep))
    const stairHeight = stairFloorHeight(nextX, nextZ)
    if (stairHeight !== null && stairHeight >= 4.65) onSecondFloor.current = true
    if (stairHeight !== null && stairHeight <= 0.1 && nextZ > 6.4) onSecondFloor.current = false
    const floor = stairHeight ?? (onSecondFloor.current && isSecondFloorDeck(nextX, nextZ) ? 4.8 : 0)
    body.current.setNextKinematicTranslation({x: nextX, y: bodyCenter + floor + 0.002, z: nextZ})
  })

  useFrame(() => {
    eye.current?.getWorldPosition(camera.position)
    camera.rotation.set(look.current.pitch, look.current.yaw, 0, 'YXZ')
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, bodyCenter + 0.002, visitor.spawnZ]}
      lockRotations canSleep={false} ccd>
      <CapsuleCollider args={[visitor.halfCylinder, visitor.radius]} friction={0}
        frictionCombineRule={rapier.CoefficientCombineRule.Min} restitution={0} />
      <group ref={eye} position={[0, visitor.eyeHeight - bodyCenter, 0]} />
    </RigidBody>
  )
}
