import { useEffect, useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'

import { prepareAuditoriumMaterials } from './auditoriumMaterials'

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
  const amberTexture = useTexture(`${import.meta.env.BASE_URL}materials/amber-frosted-glass.jpg`)
  const { model, dispose } = useMemo(
    () => prepareAuditoriumMaterials(scene, amberTexture), [scene, amberTexture],
  )
  useEffect(() => dispose, [dispose])
  return <RigidBody type="fixed" colliders={false} position={position}>
    <primitive object={model}/>
    {boxes.map((box, i) => <CuboidCollider key={i} args={box.halfExtents} position={box.center} rotation={box.rotation}/>)}
  </RigidBody>
}
