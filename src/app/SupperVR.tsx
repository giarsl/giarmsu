import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { VRButton } from 'three/addons/webxr/VRButton.js'

const vertexShader = `
  varying vec3 direction;
  void main() {
    direction = position;
    gl_Position = projectionMatrix * vec4(mat3(modelViewMatrix) * position, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D panorama;
  varying vec3 direction;
  void main() {
    vec3 ray = normalize(direction);
    float angle = acos(clamp(-ray.z, -1.0, 1.0));
    if (angle > 1.5707963) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    vec2 uv = vec2(0.5) + ray.xy * (angle / (3.14159265 * max(length(ray.xy), 0.00001)));
    gl_FragColor = texture2D(panorama, uv);
    #include <colorspace_fragment>
  }
`

export default function SupperVR() {
  const container = useRef<HTMLDivElement>(null)
  const headset = useRef<HTMLDivElement>(null)
  const zoom = useRef(1)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [supportsVR, setSupportsVR] = useState(false)
  const [status, setStatus] = useState('Đang tải ảnh VR180…')

  useEffect(() => {
    const host = container.current!
    const xrHost = headset.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      setStatus('Trình duyệt này cần hỗ trợ WebGL 2 để xem VR180.')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.xr.enabled = true
    renderer.xr.setReferenceSpaceType('local')
    const canvas = renderer.domElement
    host.append(canvas)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0)
    const camera = new THREE.PerspectiveCamera(54, 1, 0.05, 60)
    camera.rotation.order = 'YXZ'
    const geometry = new THREE.SphereGeometry(30, 40, 24)
    const eyes = [0, 1, 2].map((layer) => {
      const material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, side: THREE.BackSide,
        uniforms: { panorama: { value: null } },
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.frustumCulled = false
      mesh.visible = false
      mesh.layers.set(layer)
      scene.add(mesh)
      return mesh
    })

    const loader = new THREE.TextureLoader()
    let disposed = false
    let textures: THREE.Texture[] = []
    let drag: { id: number; x: number; y: number } | undefined
    let yaw = 0
    let pitch = 0
    let xrButton: HTMLElement | undefined
    void navigator.xr?.isSessionSupported('immersive-vr').then((supported) => {
      if (!supported || disposed) return
      xrButton = VRButton.createButton(renderer)
      xrHost.append(xrButton)
      setSupportsVR(true)
    }).catch(() => {})
    const resize = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
        Math.tan(THREE.MathUtils.degToRad(27)) / Math.max(1, width / height),
      ))
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const reset = () => {
      yaw = pitch = 0
      drag = undefined
      camera.rotation.set(0, 0, 0)
    }
    const startDrag = (event: PointerEvent) => {
      if (drag || event.button !== 0) return
      canvas.setPointerCapture(event.pointerId)
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
    }
    const moveDrag = (event: PointerEvent) => {
      if (drag?.id !== event.pointerId) return
      yaw = THREE.MathUtils.clamp(yaw + (event.clientX - drag.x) * 0.14, -90, 90)
      pitch = THREE.MathUtils.clamp(pitch + (event.clientY - drag.y) * 0.14, -63, 63)
      drag.x = event.clientX
      drag.y = event.clientY
      camera.rotation.set(THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(yaw), 0)
    }
    const endDrag = () => { drag = undefined }
    canvas.addEventListener('pointerdown', startDrag)
    canvas.addEventListener('pointermove', moveDrag)
    canvas.addEventListener('lostpointercapture', endDrag)
    const setEyeVisibility = () => {
      reset()
      if (textures.length !== 2) return
      const xr = renderer.xr.isPresenting
      eyes[0].visible = !xr
      eyes[1].visible = eyes[2].visible = xr
    }
    renderer.xr.addEventListener('sessionstart', setEyeVisibility)
    renderer.xr.addEventListener('sessionend', setEyeVisibility)

    const pending = ['left', 'right'].map((eye) => loader.loadAsync(
      `${import.meta.env.BASE_URL}supper180/front-${eye}.jpg?v=3072`,
    ))
    void Promise.allSettled(pending).then((results) => {
      const images = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
      if (disposed || images.length !== 2) {
        images.forEach((texture) => texture.dispose())
        if (!disposed) setStatus('Không tải được ảnh VR180.')
        return
      }
      textures = images
      textures.forEach((texture) => { texture.colorSpace = THREE.SRGBColorSpace })
      eyes.forEach((mesh, index) => {
        mesh.material.uniforms.panorama.value = textures[index === 2 ? 1 : 0]
      })
      setEyeVisibility()
      setStatus('')
    })

    renderer.setAnimationLoop(() => {
      const nextZoom = renderer.xr.isPresenting ? 1 : zoom.current
      if (camera.zoom !== nextZoom) {
        camera.zoom = nextZoom
        camera.updateProjectionMatrix()
      }
      renderer.render(scene, camera)
    })
    return () => {
      disposed = true
      observer.disconnect()
      renderer.setAnimationLoop(null)
      const session = renderer.xr.getSession()
      void session?.end().catch(() => {})
      renderer.xr.removeEventListener('sessionstart', setEyeVisibility)
      renderer.xr.removeEventListener('sessionend', setEyeVisibility)
      textures.forEach((texture) => texture.dispose())
      eyes.forEach((eye) => eye.material.dispose())
      geometry.dispose()
      renderer.dispose()
      canvas.remove()
      xrButton?.remove()
    }
  }, [])

  const adjustZoom = (step: number) => {
    zoom.current = THREE.MathUtils.clamp(zoom.current + step, 1, 2)
    setZoomLevel(zoom.current)
  }

  return <main className="supper-vr">
    <div className="supper-vr-view" ref={container} />
    <header className="supper-vr-header">
      <a href={import.meta.env.BASE_URL}>← Hội trường</a>
      <a href="?view=supper-photos">Ảnh chi tiết</a>
      <h1>Bữa Tiệc Ly · VR180</h1>
    </header>
    {status && <p className="supper-vr-status" role="status">{status}</p>}
    <div className={supportsVR ? "supper-vr-controls has-headset" : "supper-vr-controls"}>
      <div className="supper-vr-zoom" role="group" aria-label="Thu phóng">
        <button type="button" aria-label="Thu nhỏ" disabled={zoomLevel <= 1}
          onClick={() => adjustZoom(-0.25)}>−</button>
        <button type="button" aria-label="Phóng to" disabled={zoomLevel >= 2}
          onClick={() => adjustZoom(0.25)}>+</button>
      </div>
      <small>Kéo để nhìn quanh</small>
    </div>
    <div ref={headset} />
  </main>
}
