import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createRenderer } from '../utils/createRenderer.js'
import { fitModelToGround } from '../utils/fitModelToGround.js'
import { loadGlbBuffer, pruneGlbCache } from '../utils/cacheGlb.js'
import { CARS } from '../data/cars.js'

/** Showcase di origin; framing kiri pakai camera.setViewOffset */
const SHOWCASE_POS = new THREE.Vector3(0, 0, 0)
const BROWSE_CAM = new THREE.Vector3(-1.2, 2.6, 6.5)
const BROWSE_TARGET = new THREE.Vector3(1.4, 0.7, 0.4)
/** Lebih dekat = mobil lebih besar di detail */
const DETAIL_CAM = new THREE.Vector3(0, 1.45, 4.4)
const DETAIL_TARGET = new THREE.Vector3(0, 0.65, 0)
const DETAIL_SCALE = 1.15
/** Dinding sedikit lebih terang dari lantai. Selisihnya kecil. */
const WALL_COLOR = 0x252830
const FLOOR_COLOR = 0x21242b
const FLOOR_WIDTH = 22
const FLOOR_LENGTH = 22

/**
 * @param {HTMLElement} mount
 * @param {{
 *   onHover?: (info: null | { id: string, name: string, price: string }) => void
 *   onActivity?: () => void
 *   onSelect?: (car: object | null) => void
 *   onFirstCar?: () => void
 *   onSlots?: (slots: { id: string, name: string, progress: number, phase: string, x: number, y: number, visible: boolean }[]) => void
 * }} callbacks
 */
export function createShopScene(mount, { onHover, onActivity, onSelect, onFirstCar, onSlots } = {}) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(WALL_COLOR)

  const camera = new THREE.PerspectiveCamera(
    40,
    mount.clientWidth / mount.clientHeight,
    0.1,
    200,
  )
  camera.position.copy(BROWSE_CAM)

  const renderer = createRenderer(mount)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.copy(BROWSE_TARGET)
  // Bebas seperti sebelumnya — tanpa kunci sudut / jarak ketat
  controls.minDistance = 1
  controls.maxDistance = 40
  controls.maxPolarAngle = Math.PI
  controls.autoRotate = false

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
  keyLight.position.set(6, 10, 8)
  scene.add(keyLight)
  const fillLight = new THREE.DirectionalLight(0xa0b4ff, 0.45)
  fillLight.position.set(-8, 3, -4)
  scene.add(fillLight)

  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.setSize(mount.clientWidth, mount.clientHeight)
  composer.addPass(new RenderPass(scene, camera))
  const outlinePass = new OutlinePass(
    new THREE.Vector2(mount.clientWidth, mount.clientHeight),
    scene,
    camera,
  )
  outlinePass.edgeStrength = 4
  outlinePass.edgeGlow = 0
  outlinePass.edgeThickness = 1.5
  outlinePass.pulsePeriod = 0
  outlinePass.visibleEdgeColor.set(0xffffff)
  outlinePass.hiddenEdgeColor.set(0xffffff)
  composer.addPass(outlinePass)
  composer.addPass(new OutputPass())

  const floorGeometry = new THREE.PlaneGeometry(FLOOR_WIDTH, FLOOR_LENGTH)
  const floorMaterial = new THREE.MeshBasicMaterial({
    color: FLOOR_COLOR,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(2, -0.02, 0.5)
  scene.add(floor)

  /** @type {{ root: THREE.Group, hitMesh: THREE.Mesh, data: object, homePos: THREE.Vector3, homeRotY: number, _returnHome?: boolean }[]} */
  const products = []
  const loader = new GLTFLoader()
  const loadAbort = new AbortController()
  /** @type {Map<string, { car: object, progress: number, phase: string }>} */
  const pending = new Map(CARS.map((car) => [car.id, { car, progress: 0, phase: 'download' }]))
  let firstCarSent = false
  let slotSignature = ''
  const slotPoint = new THREE.Vector3()
  const slotProjected = new THREE.Vector3()
  const slotCamDir = new THREE.Vector3()
  const slotOffset = new THREE.Vector3()

  let disposed = false
  let frameId = 0
  let mode = 'browse'
  let hoveredProduct = null
  let selectedProduct = null
  let pointerOverSelected = false
  let userOrbiting = false
  let activitySent = false
  let transitioning = false
  let pointerDown = null
  let didDrag = false

  const clock = new THREE.Clock()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const camGoal = new THREE.Vector3().copy(BROWSE_CAM)
  const targetGoal = new THREE.Vector3().copy(BROWSE_TARGET)
  const showcasePos = new THREE.Vector3()

  /** Hanya saat user benar-benar drag kamera (OrbitControls start) */
  const notifyCameraMove = () => {
    // Drag sebelum mobil pertama tampil tidak boleh menghabiskan fade judul.
    if (!firstCarSent || activitySent) return
    activitySent = true
    onActivity?.()
  }

  const emitHover = (product) => {
    if (mode === 'detail' || !product) {
      onHover?.(null)
      return
    }
    onHover?.({
      id: product.data.id,
      name: product.data.name,
      price: product.data.price,
    })
  }

  const placeCar = (gltf, carData) => {
    if (disposed) return

    const model = gltf.scene
    fitModelToGround(model, carData.size ?? 2.8)

    const root = new THREE.Group()
    root.position.set(...carData.position)
    root.rotation.y = THREE.MathUtils.degToRad(carData.rotationY ?? 0)
    root.add(model)

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 1.05, size.y * 1.05, size.z * 1.05),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    hitMesh.position.copy(center)
    root.add(hitMesh)

    scene.add(root)
    products.push({
      root,
      hitMesh,
      data: carData,
      homePos: root.position.clone(),
      homeRotY: root.rotation.y,
    })
    pending.delete(carData.id)
    emitSlots()

    if (!firstCarSent) {
      firstCarSent = true
      onFirstCar?.()
    }
  }

  const emitSlots = () => {
    if (!onSlots || disposed) return

    const list = []
    if (mode === 'browse') {
      const width = mount.clientWidth
      const height = mount.clientHeight
      camera.getWorldDirection(slotCamDir)

      pending.forEach(({ car, progress, phase }) => {
        slotPoint.set(car.position[0], 1.15, car.position[2])
        const inFront = slotOffset.copy(slotPoint).sub(camera.position).dot(slotCamDir) > 0.2
        slotProjected.copy(slotPoint).project(camera)
        const x = (slotProjected.x * 0.5 + 0.5) * width
        const y = (-slotProjected.y * 0.5 + 0.5) * height
        const visible =
          inFront && x > -80 && x < width + 80 && y > -80 && y < height + 80
        list.push({
          id: car.id,
          name: car.name,
          progress,
          phase,
          x,
          y,
          visible,
        })
      })
    }

    const signature = list
      .map(
        (slot) =>
          `${slot.id}|${Math.round(slot.progress * 100)}|${Math.round(slot.x)}|${Math.round(slot.y)}|${slot.visible ? 1 : 0}|${slot.phase}`,
      )
      .join(';')
    if (signature === slotSignature) return
    slotSignature = signature
    onSlots(list)
  }

  pruneGlbCache(CARS.map((car) => car.url))

  CARS.forEach((carData) => {
    loadGlbBuffer(
      carData.url,
      ({ progress, phase }) => {
        const slot = pending.get(carData.id)
        if (!slot || disposed) return
        slot.progress = progress
        slot.phase = phase
        emitSlots()
      },
      loadAbort.signal,
    )
      .then(
        (buffer) =>
          new Promise((resolve, reject) => {
            loader.parse(buffer, '', resolve, reject)
          }),
      )
      .then((gltf) => placeCar(gltf, carData))
      .catch((error) => {
        if (disposed || error?.name === 'AbortError') return
        console.error(`Gagal load ${carData.name}:`, error)
        pending.delete(carData.id)
        emitSlots()
        if (!firstCarSent && pending.size === 0) {
          firstCarSent = true
          onFirstCar?.()
        }
      })
  })

  const syncOutline = (product) => {
    if (!product) {
      outlinePass.selectedObjects = []
      return
    }
    const meshes = []
    product.root.traverse((child) => {
      if (!child.isMesh || child === product.hitMesh) return
      const label = `${child.name} ${child.parent?.name ?? ''}`.toLowerCase()
      // Plane bawaan model (bayangan datar) bikin stroke jadi kotak
      if (label.includes('plane')) return
      meshes.push(child)
    })
    outlinePass.selectedObjects = meshes
  }

  const clearHover = () => {
    if (!hoveredProduct) return
    hoveredProduct = null
    syncOutline(null)
    if (mode === 'browse') mount.style.cursor = 'default'
    emitHover(null)
  }

  /** Geser pusat proyeksi ke tengah area kiri (non-panel) */
  const applyDetailFraming = () => {
    const w = mount.clientWidth
    const h = mount.clientHeight
    const panelWidth = Math.min(400 + 80, w * 0.42)
    const stageWidth = w - panelWidth
    const stageCenterX = stageWidth / 2
    const screenCenterX = w / 2
    const offsetX = screenCenterX - stageCenterX
    camera.setViewOffset(w, h, offsetX, 0, w, h)
    camera.updateProjectionMatrix()
  }

  const clearDetailFraming = () => {
    camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }

  const pickProduct = (event) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    const targets =
      mode === 'detail' && selectedProduct
        ? [selectedProduct.hitMesh]
        : products.map((p) => p.hitMesh)

    const hits = raycaster.intersectObjects(targets, false)
    if (!hits.length) return null
    return products.find((p) => p.hitMesh === hits[0].object) ?? null
  }

  const enterDetail = (product) => {
    if (transitioning || mode === 'detail') return
    mode = 'detail'
    selectedProduct = product
    clearHover()
    transitioning = true
    pointerOverSelected = false
    userOrbiting = false

    products.forEach((p) => {
      p.root.visible = p === product
    })

    showcasePos.copy(SHOWCASE_POS)
    product.root.scale.setScalar(DETAIL_SCALE)
    camGoal.copy(DETAIL_CAM)
    targetGoal.copy(DETAIL_TARGET)
    applyDetailFraming()

    onSelect?.(product.data)
  }

  const exitDetail = () => {
    if (mode !== 'detail' || !selectedProduct) return
    mode = 'browse'
    transitioning = true
    pointerOverSelected = false
    userOrbiting = false

    products.forEach((p) => {
      p.root.visible = true
    })

    selectedProduct.root.scale.setScalar(1)
    clearDetailFraming()
    camGoal.copy(BROWSE_CAM)
    targetGoal.copy(BROWSE_TARGET)
    activitySent = false
    onSelect?.(null)

    const leaving = selectedProduct
    selectedProduct = null
    leaving._returnHome = true
  }

  const onPointerDown = (event) => {
    pointerDown = { x: event.clientX, y: event.clientY }
    didDrag = false
  }

  const onPointerMove = (event) => {
    if (pointerDown) {
      const dx = event.clientX - pointerDown.x
      const dy = event.clientY - pointerDown.y
      if (dx * dx + dy * dy > 36) didDrag = true
    }

    const product = pickProduct(event)

    if (mode === 'detail') {
      pointerOverSelected = Boolean(product && product === selectedProduct)
      mount.style.cursor = pointerOverSelected || userOrbiting ? 'grab' : 'default'
      return
    }

    if (!product) {
      clearHover()
      return
    }

    mount.style.cursor = 'pointer'
    hoveredProduct = product
    syncOutline(product)
    emitHover(product)
  }

  const onPointerLeave = () => {
    pointerDown = null
    pointerOverSelected = false
    if (mode === 'browse') clearHover()
    else mount.style.cursor = 'default'
  }

  const onPointerUp = () => {
    pointerDown = null
  }

  const onClick = (event) => {
    if (mode !== 'browse' || didDrag) return
    const product = pickProduct(event)
    if (product) enterDetail(product)
  }

  // Fade intro HANYA saat user mulai drag/orbit kamera
  controls.addEventListener('start', () => {
    userOrbiting = true
    notifyCameraMove()
  })
  controls.addEventListener('end', () => {
    userOrbiting = false
  })

  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerleave', onPointerLeave)
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('click', onClick)

  const onResize = () => {
    const { clientWidth: w, clientHeight: h } = mount
    camera.aspect = w / h
    if (mode === 'detail') applyDetailFraming()
    else {
      camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
    renderer.setSize(w, h)
    composer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  const animate = () => {
    frameId = requestAnimationFrame(animate)
    const dt = clock.getDelta()

    // Lerp kamera HANYA saat transisi mode — setelah itu OrbitControls bebas
    if (transitioning) {
      camera.position.lerp(camGoal, 0.08)
      controls.target.lerp(targetGoal, 0.08)
      if (
        camera.position.distanceTo(camGoal) < 0.05 &&
        controls.target.distanceTo(targetGoal) < 0.05
      ) {
        camera.position.copy(camGoal)
        controls.target.copy(targetGoal)
        transitioning = false
      }
    }

    if (selectedProduct && mode === 'detail') {
      selectedProduct.root.position.lerp(showcasePos, 0.1)

      // Mutar mobil pelan kalau user tidak drag kamera & tidak hover mobil
      if (!userOrbiting && !pointerOverSelected) {
        selectedProduct.root.rotation.y += dt * 0.45
      }
    }

    products.forEach((p) => {
      if (!p._returnHome) return
      p.root.position.lerp(p.homePos, 0.12)
      p.root.rotation.y = THREE.MathUtils.lerp(p.root.rotation.y, p.homeRotY, 0.12)
      if (p.root.position.distanceTo(p.homePos) < 0.03) {
        p.root.position.copy(p.homePos)
        p.root.rotation.y = p.homeRotY
        p._returnHome = false
      }
    })

    controls.update()
    emitSlots()
    composer.render()
  }
  animate()

  return {
    deselect: exitDetail,
    dispose: () => {
      disposed = true
      loadAbort.abort()
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('click', onClick)
      clearHover()
      floorGeometry.dispose()
      floorMaterial.dispose()
      outlinePass.dispose()
      composer.dispose()
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement)
      }
    },
  }
}
