import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'

function surface(base: number[], grain: number, scale: number, joints = false) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!
  const data = context.createImageData(size, size)
  let seed = 97531
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ripple = Math.sin(x * .09 + Math.sin(y * .13)) * Math.cos(y * .048)
      const value = (random() - .5) * grain + ripple * grain * .1
      const seam = joints && (x === 0 || y === 0) ? .78 : 1
      const i = (y * size + x) * 4
      base.forEach((c, channel) => { data.data[i + channel] = (c + value) * seam })
      data.data[i + 3] = 255
    }
  }
  context.putImageData(data, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(scale, scale)
  texture.anisotropy = 4
  return new MeshStandardMaterial({ map: texture, roughness: .94, metalness: 0 })
}
export function makeMaterials() {
  return {
    stone: surface([82,80,75], 10, 1, true),
    shell: surface([113,108,98], 15, 1),
    fin: surface([153,145,131], 13, 1),
    plaster: surface([186,177,155], 10, 1),
    dark: surface([50,48,43], 8, 1),
    wood: surface([99,76,57], 9, 1),
    fabric: surface([67,65,60], 14, 1),
    lamp: new MeshStandardMaterial({ color: '#e4cbaa', emissive: '#f2d5b4', emissiveIntensity: 1.05, roughness: .85 })
  }
}
export type Materials = ReturnType<typeof makeMaterials>
