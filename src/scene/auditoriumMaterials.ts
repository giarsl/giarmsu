import { Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, MirroredRepeatWrapping, SRGBColorSpace, type Material, type Object3D, type Texture } from 'three'

const limestone = { color: '#b5ab9d', roughness: 0.72, scale: 24, strength: 0.22, aggregate: false }
const terrazzo = { color: '#a29a8d', roughness: 0.85, scale: 38, strength: 0.24, aggregate: true }
const stageTreads = { ...limestone, color: '#a89d8d', roughness: 0.83, scale: 32, strength: 0.26 }
const stairParapet = { color: '#85817a', roughness: 0.88, scale: 35, strength: 0.17, aggregate: false }
const balconyFloor = { ...terrazzo, color: '#a8a194', scale: 43, strength: 0.2 }
const balconyDeck = { color: '#66635e', roughness: 0.91, scale: 28, strength: 0.18, aggregate: false }
const balconyParapet = { ...stairParapet, color: '#a29b90', scale: 39 }
const chiffon = { color: '#e7e1d7', roughness: 0.86, scale: 145, strength: 0.09, aggregate: false }
const cross = { ...chiffon, color: '#b9ab96' }
const graphiteConcrete = { color: '#777673', roughness: 0.92, scale: 31, strength: 0.21, aggregate: false }
const graphiteFelt = { color: '#585756', roughness: 0.97, scale: 118, strength: 0.12, aggregate: false }
const waveSlat = { color: '#c4c2bc', roughness: 0.8, scale: 46, strength: 0.15, aggregate: false }
const waveRail = { color: '#777572', roughness: 0.87, scale: 63, strength: 0.1, aggregate: false }
const basaltBaseboard = { color: '#484744', roughness: 0.8, scale: 40, strength: 0.13, aggregate: false }
const seatUpholstery = { color: '#6d5d52', roughness: 0.94, scale: 185, strength: 0.2, aggregate: false }
const seatFrame = { color: '#3f4143', roughness: 0.82, scale: 92, strength: 0.07, aggregate: false }
const stageArchStone = { ...limestone, color: '#ada395', roughness: 0.82, scale: 31, strength: 0.25 }
const archivoltBasalt = { ...basaltBaseboard, color: '#605b54', roughness: 0.84, scale: 41 }
const wroughtIron = { color: '#414042', roughness: 0.71, scale: 77, strength: 0.13, aggregate: false }

function settingsFor(name: string) {
  if (name === 'STG | warm grey limestone') return stageTreads
  if (name === 'MAT_Gothic_Stone_Relief') return stageArchStone
  if (name === 'Đá bazan | gờ vòm') return archivoltBasalt
  if (name === 'Sắt rèn graphite') return wroughtIron
  if (/limestone/i.test(name)) return limestone
  if (name.startsWith('Terrazzo | fine aggregate')) return terrazzo
  if (name.startsWith('FR Sheer Chiffon | Thập giá')) return cross
  if (name.startsWith('FR Sheer Chiffon |')) return chiffon
  if (name === 'Tường bên | bê tông graphite') return graphiteConcrete
  if (name.startsWith('Tường hậu | tấm nỉ graphite')) return graphiteFelt
  if (name === 'Chân tường | đá basalt mài') return basaltBaseboard
  if (name === 'Lam cánh chim | GFRC xám bạc') return waveSlat
  if (name === 'Wing | acoustic felt') return graphiteFelt
  if (name === 'Wing | battens') return waveRail
  if (/^Upholstery \| taupe weave(?:\.001)?$/.test(name)) return seatUpholstery
  if (/^Powder coat \| graphite(?:\.001)?$/.test(name)) return seatFrame
}

function balconyFinish(objectName: string, materialName: string) {
  if (objectName === 'Balcony_CurvedParapet' && materialName === 'Warm grey | GFRC') return balconyParapet
  if (objectName === 'Balcony_StructuralDeck' && materialName === 'Charcoal | architectural concrete.001') return balconyDeck
  if (/^Upper_(Tier_0[1-3]|RearLanding)$/.test(objectName) && materialName === 'Terrazzo | fine aggregate.001') {
    return balconyFloor
  }
}

const grainFunctions = `
varying vec3 materialPosition;
float materialHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float materialNoise(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = smoothstep(vec3(0.0), vec3(1.0), fract(p));
  return mix(
    mix(mix(materialHash(cell), materialHash(cell + vec3(1,0,0)), f.x),
        mix(materialHash(cell + vec3(0,1,0)), materialHash(cell + vec3(1,1,0)), f.x), f.y),
    mix(mix(materialHash(cell + vec3(0,0,1)), materialHash(cell + vec3(1,0,1)), f.x),
        mix(materialHash(cell + vec3(0,1,1)), materialHash(cell + vec3(1,1,1)), f.x), f.y), f.z);
}
`

function withMaterialPosition(vertexShader: string) {
  return vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 materialPosition;')
    .replace('#include <project_vertex>', `
      materialPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>
    `)
}

function createAmberGlass(original: Material, texture: Texture) {
  const material = new MeshBasicMaterial({ name: original.name, side: original.side, toneMapped: false })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.amberGlassTexture = { value: texture }
    shader.vertexShader = withMaterialPosition(shader.vertexShader)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 materialPosition;
        uniform sampler2D amberGlassTexture;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= texture2D(amberGlassTexture, materialPosition.xy * 0.52).rgb;`)
  }
  return material
}

export function prepareAuditoriumMaterials(scene: Object3D, amberTexture: Texture) {
  amberTexture.colorSpace = SRGBColorSpace
  amberTexture.wrapS = amberTexture.wrapT = MirroredRepeatWrapping
  amberTexture.needsUpdate = true
  const model = scene.clone()
  const replacements = new Map<string, Material>()
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const replace = (original: Material) => {
      if (!(original instanceof MeshStandardMaterial)) return original
      const isParapet = original.name === 'Warm grey | GFRC'
        && /^CurvedStair_(INNER|OUTER)_PARAPET_[LR]$/.test(object.name)
      const settings = (isParapet ? stairParapet : balconyFinish(object.name, original.name))
        ?? settingsFor(original.name)
      const key = `${original.uuid}:${settings?.color ?? 'original'}`
      const existing = replacements.get(key)
      if (existing) return existing
      if (/^Alabaster \| edge sealed \| bay [0-6]$/.test(original.name)) {
        const material = createAmberGlass(original, amberTexture)
        replacements.set(key, material)
        return material
      }
      if (!settings || original.map) return original

      const material = original.clone()
      material.color = new Color(settings.color)
      material.roughness = settings.roughness
      if (settings === wroughtIron) material.metalness = 0.3
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = withMaterialPosition(shader.vertexShader)
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\n' + grainFunctions)
          .replace('#include <color_fragment>', `
            #include <color_fragment>
            vec3 grainPoint = materialPosition * ${settings.scale.toFixed(1)};
            float grain = 0.65 * materialNoise(grainPoint * 0.18) + 0.35 * materialNoise(grainPoint);
            float detailFade = 1.0 - smoothstep(0.5, 2.0, length(fwidth(grainPoint)));
            diffuseColor.rgb *= 1.0 + (grain - 0.5) * ${settings.strength} * detailFade;
            ${settings.aggregate ? `
              float fleck = 1.0 - smoothstep(0.16, 0.36, length(fract(grainPoint) - 0.5));
              float shade = materialHash(floor(grainPoint));
              diffuseColor.rgb *= 1.0 + fleck * (shade - 0.55) * 0.65 * detailFade;
            ` : ''}
          `)
      }
      material.customProgramCacheKey = () => `auditorium-grain-${settings.scale}`
      replacements.set(key, material)
      return material
    }
    object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material)
  })
  return {
    model,
    dispose: () => replacements.forEach((material) => material.dispose()),
  }
}
