import { useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BoxGeometry, MeshStandardMaterial } from 'three'
import { makeMaterials } from './Materials'
import { Seating } from './Seating'
import { Lighting } from './Lighting'

type Vec = [number, number, number]
const boxCache = new Map<string, BoxGeometry>()
function sizedBox(size:Vec) {
  const key = size.join(',')
  const cached = boxCache.get(key)
  if (cached) return cached
  const g = new BoxGeometry(...size)
  const uv = g.attributes.uv
  for(let i=0;i<uv.count;i++){
    const axis = Math.floor(i/8)
    uv.setXY(i,uv.getX(i)*(axis===0?size[2]:size[0])/1.5,uv.getY(i)*(axis===1?size[2]:size[1])/1.5)
  }
  boxCache.set(key,g)
  return g
}
function Block({p,s,m,solid=false,rz=0,ry=0}:{
  p:Vec,s:Vec,m:MeshStandardMaterial,solid?:boolean,rz?:number,ry?:number
}) {
  return <>
    <mesh position={p} rotation={[0,ry,rz]} geometry={sizedBox(s)} material={m}/>
    {solid && <CuboidCollider args={[s[0]/2,s[1]/2,s[2]/2]} position={p} rotation={[0,ry,rz]}/>}
  </>
}
export default function Auditorium(){
  const m=useMemo(makeMaterials,[])
  return <>
    <Lighting/>
    <RigidBody type="fixed" colliders={false}>
      <Block p={[0,-.14,1.5]} s={[18.6,.28,31.6]} m={m.stone} solid/>
      <Block p={[0,7.55,0]} s={[18.6,.3,28.6]} m={m.dark} solid/>
      {[-1,1].map(side=><group key={side}>
        <Block p={[side*9.15,3.7,0]} s={[.3,7.4,28.5]} m={m.shell} solid/>
        <Block p={[side*5.37,3.7,14.15]} s={[7.26,7.4,.3]} m={m.shell} solid/>
        <Block p={[side*1.89,1.55,15.7]} s={[.3,3.1,3.2]} m={m.shell} solid/>
        {Array.from({length:8},(_,i)=>{
          const z=-12.3+i*3.55
          return <group key={z}>
            <Block p={[side*8.77,3.36,z]} s={[.46,6.72,.34]} ry={side*.14} m={m.fin} solid/>
            <Block p={[side*8.97,6.30,z+1.65]} s={[.07,.29,2.54]} m={m.lamp}/>
            <Block p={[side*8.82,6.12,z+1.65]} s={[.36,.19,2.92]} m={m.fin}/>
            <Block p={[side*4.50,6.86,z+.98]} s={[9.04,.20,2.46]} rz={side*-.103} m={m.shell}/>
            <Block p={[side*4.50,6.74,z-.25]} s={[9.04,.46,.15]} rz={side*-.103} m={m.fin}/>
          </group>
        })}
      </group>)}
      <Block p={[0,5.25,14.15]} s={[3.5,4.3,.3]} m={m.shell} solid/>
      <Block p={[0,3.19,15.7]} s={[3.8,.22,3.2]} m={m.dark} solid/>
      <Block p={[0,1.55,17.25]} s={[3.8,3.1,.26]} m={m.wood} solid/>
      <Block p={[0,3.7,-14.15]} s={[18.6,7.4,.3]} m={m.shell} solid/>
      <Block p={[0,.27,-11.84]} s={[17.25,.54,4.32]} m={m.fin} solid/>
      <Block p={[0,.105,-9.55]} s={[12,.21,.28]} m={m.stone} solid/>
      <Block p={[0,.195,-9.77]} s={[12,.39,.28]} m={m.stone} solid/>
      {/* Four ashlar pieces leave an illuminated cruciform reveal in the sanctuary wall. */}
      <Block p={[0,3.83,-13.89]} s={[5.55,6.37,.10]} m={m.dark}/>
      <Block p={[0,3.87,-13.78]} s={[.099,3.7,.08]} m={m.lamp}/>
      <Block p={[0,4.53,-13.78]} s={[1.88,.094,.08]} m={m.lamp}/>
      {[-1,1].map(side=><group key={side}>
        <Block p={[side*1.91,3.80,-13.56]} s={[1.80,6.43,.43]} m={m.plaster} solid/>
        <Block p={[side*.531,5.78,-13.56]} s={[.953,2.40,.43]} m={m.plaster} solid/>
        <Block p={[side*.531,2.52,-13.56]} s={[.953,3.92,.43]} m={m.plaster} solid/>
        <Block p={[side*5.78,3.55,-13.79]} s={[5.60,5.95,.26]} m={m.shell} solid/>
      </group>)}
      <Block p={[0,.008,.05]} s={[2.20,.016,19.5]} m={m.shell}/>
      <Seating m={m}/>
    </RigidBody>
  </>
}
