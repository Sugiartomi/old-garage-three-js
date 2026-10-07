import * as THREE from 'three'

export function createRenderer(canvasParent) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(canvasParent.clientWidth, canvasParent.clientHeight)
  canvasParent.appendChild(renderer.domElement)
  return renderer
}
