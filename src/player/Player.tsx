import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { bodyCenter, visitor } from './playerConfig'

const navigationKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'])

function stairFloorHeight(x: number, z: number): number | null {
  // The Blender treads are visual geometry; a height profile keeps the capsule
  // supported continuously instead of colliding with every vertical riser.
  for (const stairX of [-6.5, 6.5]) {
    if (Math.abs(x - stairX) > 0.72) continue
    if (z <= 6.7 && z >= 1.9) return ((6.7 - z) / 4.8) * 2.4
    if (z < 1.9 && z >= 0.7) return 2.4
    if (z < 0.7 && z >= -4.1) return 2.55 + ((0.7 - z) / 4.8) * 2.25
    if (z < -4.1 && z >= -8) return 4.8
  }
  return null
}

function reachableStairHeight(x: number, z: number, currentFloor: number) {
  const height = stairFloorHeight(x, z)
  // The lower rear aisle overlaps the upper landing in plan. A step can only
  // connect to a stair surface near the visitor's current foot height.
  return height !== null && Math.abs(height - currentFloor) <= 0.22 ? height : null
}

function stageFloorHeight(x: number, z: number) {
  // Stage coordinates come from the GLB tread tops after applying the model offset.
  const distanceFromCenter = Math.abs(x + 0.025)
  if (distanceFromCenter > 4.625 || z > 8.32) return 0
  const curvedEdge = 0.00465 * distanceFromCenter ** 2
  const rise = (edge: number) => Math.max(0, Math.min(1, (z - edge + 0.08) / 0.16)) * 0.16
  const platform = rise(6.45 + curvedEdge)
  if (distanceFromCenter > 3.9) return platform * 3
  return rise(5.81 + curvedEdge) + rise(6.13 + curvedEdge) + platform
}

function isSecondFloorDeck(x: number, z: number) {
  return x >= -7.4 && x <= 7.4 && z >= -8.75 && z <= -2.75
}

function seatingFloorHeight(x: number, z: number, upstairs: boolean) {
  // These ranges cover the GLB seating tiers and their rear landings in world coordinates.
  if (x < -5.6 || x > 5.55 || z < -8.7) return upstairs ? 4.8 : 0
  const front = upstairs ? -4.95 : 3.22
  const rowDepth = upstairs ? 0.95 : 0.85
  const rows = upstairs ? 3 : 10
  const depth = front - z
  const transition = 0.16
  // Ease the rise around each riser, and keep the camera level between rows.
  const progress = Math.max(0, (depth + transition / 2) / rowDepth)
  const completed = Math.floor(progress)
  const rise = Math.min(rows, completed + Math.min(1, (progress - completed) * rowDepth / transition))
  return (upstairs ? 4.8 : 0) + rise * 0.15
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
    const nextZ = Math.max(-8.7, Math.min(14, position.z + velocity.z * world.timestep))
    const currentFloor = position.y - bodyCenter - 0.002
    const stairHeight = reachableStairHeight(nextX, nextZ, currentFloor)
    const overDeck = isSecondFloorDeck(nextX, nextZ)
    if (stairHeight !== null) onSecondFloor.current = stairHeight >= 4.65
    else if (!overDeck) onSecondFloor.current = false
    const upstairs = onSecondFloor.current && overDeck
    const floor = stairHeight ?? Math.max(
      seatingFloorHeight(nextX, nextZ, upstairs),
      stageFloorHeight(nextX, nextZ),
    )
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
