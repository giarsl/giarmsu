import { Clone, useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'

export type CollisionBox = {
  center: [number, number, number]
  halfExtents: [number, number, number]
  rotation?: [number, number, number]
}

/** Visual model and its independent collision proxies share a local origin. */
export function MuseumModel({url, boxes = [], position = [0, 0, 0]}: {
  url: string
  boxes?: CollisionBox[]
  position?: [number, number, number]
}) {
  const {scene} = useGLTF(url)
  return <RigidBody type="fixed" colliders={false} position={position}>
    <Clone object={scene}/>
    {boxes.map((box, i) => <CuboidCollider key={i} args={box.halfExtents} position={box.center} rotation={box.rotation}/>)}
  </RigidBody>
}
