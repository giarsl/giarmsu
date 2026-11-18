import { useMemo } from 'react'
import { Object3D } from 'three'

function Wash({from,to,power,angle,color}:{
  from:[number,number,number],to:[number,number,number],power:number,angle:number,color:string
}) {
  const target = useMemo(() => new Object3D(), [])
  target.position.set(...to)
  return <><primitive object={target}/><spotLight position={from} target={target} intensity={power} color={color} angle={angle} penumbra={.94} decay={2} distance={27}/></>
}
export function Lighting() {
  return <>
    <hemisphereLight args={['#e9e4dd','#a49b89',.87]}/>
    <Wash from={[-4.8,6.3,-9.5]} to={[-1,2,-13.8]} power={220} angle={.85} color="#ffdfbd"/>
    <Wash from={[5.3,6.1,-10.4]} to={[3.1,1.4,-13.8]} power={170} angle={.85} color="#eee4d4"/>
    <Wash from={[-7.9,6.4,3]} to={[-4.6,1,1]} power={128} angle={1.12} color="#f4ddbd"/>
    <Wash from={[7.9,6.4,7]} to={[4.4,1,5]} power={135} angle={1.12} color="#f1e1cc"/>
    <pointLight position={[0,4.8,-1]} color="#eadbc5" intensity={45} distance={16} decay={2}/>
  </>
}
