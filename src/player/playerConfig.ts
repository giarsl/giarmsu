export const visitor = {
  eyeHeight: 1.65,
  radius: 0.28,
  halfCylinder: 0.59,
  spawnZ: 11,
  initialYaw: 0,
  walkingSpeed: 1.4,
  briskSpeed: 2.5,
  acceleration: 7,
  deceleration: 10,
  mouseSensitivity: 0.0018,
  pitchLimit: Math.PI * 0.46,
} as const

export const bodyCenter = visitor.radius + visitor.halfCylinder
