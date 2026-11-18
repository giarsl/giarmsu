import { useEffect, useRef } from 'react'
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

export default function Player() {
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
    function onMove(event: MouseEvent) {
      if (document.pointerLockElement !== canvas) return
      const state = look.current
      state.yaw -= event.movementX * visitor.mouseSensitivity
      state.pitch = Math.max(-visitor.pitchLimit, Math.min(visitor.pitchLimit,
        state.pitch - event.movementY * visitor.mouseSensitivity))
    }
    function onKeyDown(event: KeyboardEvent) {
      if (document.pointerLockElement !== canvas || !navigationKeys.has(event.code)) return
      event.preventDefault()
      input.current.add(event.code)
    }
    function onKeyUp(event: KeyboardEvent) {
      input.current.delete(event.code)
    }
    function clearInput() { input.current.clear() }

    document.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearInput)
    document.addEventListener('pointerlockchange', clearInput)
    document.addEventListener('visibilitychange', clearInput)
    return () => {
      document.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearInput)
      document.removeEventListener('pointerlockchange', clearInput)
      document.removeEventListener('visibilitychange', clearInput)
      clearInput()
    }
  }, [gl])

  useBeforePhysicsStep((world) => {
    if (!body.current) return
    const position = body.current.translation()
    const keys = input.current
    const side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'))
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'))
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
