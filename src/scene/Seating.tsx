import { useLayoutEffect, useRef } from 'react'
import { CuboidCollider } from '@react-three/rapier'
import { BoxGeometry, ExtrudeGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Shape } from 'three'
import type { Materials } from './Materials'

export const seatAnchors = Array.from({ length: 11 }, (_, row) =>
  [-1, 1].flatMap(side => Array.from({ length: 8 }, (_, i) => ({
    id: row + '-' + side + '-' + i, x: side * (1.59 + i * .82), z: -7.5 + row * 1.62
  })))).flat()

function cushion(w: number, h: number, depth: number) {
  const r = .055, x = -w/2, y = -h/2
  const s = new Shape()
  s.moveTo(x+r,y)
  s.lineTo(-x-r,y); s.quadraticCurveTo(-x,y,-x,y+r)
  s.lineTo(-x,-y-r); s.quadraticCurveTo(-x,-y,-x-r,-y)
  s.lineTo(x+r,-y); s.quadraticCurveTo(x,-y,x,-y-r)
  s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y)
  return new ExtrudeGeometry(s,{depth, bevelEnabled:true, bevelSegments:2, steps:1, bevelSize:.014, bevelThickness:.014, curveSegments:3}).translate(0,0,-depth/2)
}
const back = cushion(.65,.56,.09)
const pad = cushion(.64,.12,.43)
const cube = new BoxGeometry()
function Part({geometry,material,y,z=0,x=0,tilt=0,scale=[1,1,1]}: {
  geometry: BoxGeometry | ExtrudeGeometry, material:MeshStandardMaterial, y:number, z?:number, x?:number, tilt?:number, scale?:[number,number,number]
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const transform = new Object3D()
    transform.scale.set(...scale)
    transform.rotation.x = tilt
    seatAnchors.forEach((seat,i) => {
      transform.position.set(seat.x+x,y,seat.z+z)
      transform.updateMatrix()
      ref.current!.setMatrixAt(i, transform.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  },[x,y,z,tilt,scale])
  return <instancedMesh ref={ref} args={[geometry,material,seatAnchors.length]} />
}
export function Seating({m}: {m:Materials}) {
  return <>
    <Part geometry={back} material={m.wood} y={.76} z={.232} tilt={.13}/>
    <Part geometry={back} material={m.fabric} y={.77} z={.165} tilt={.13}/>
    <Part geometry={pad} material={m.fabric} y={.48} z={-.025}/>
    <Part geometry={cube} material={m.dark} y={.23} scale={[.17,.46,.26]}/>
    {[-.365,.365].map(x=><Part key={x} geometry={cube} material={m.wood} x={x} y={.64} z={.03} scale={[.066,.08,.45]}/>)}
    {seatAnchors.map(s=><CuboidCollider key={s.id} args={[.396,.52,.283]} position={[s.x,.52,s.z+.035]}/>)}
  </>
}
