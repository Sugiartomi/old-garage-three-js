import * as THREE from 'three'

/** Samakan ukuran model + kaki di y = 0 (lokal, sebelum digeser ke posisi toko) */
export function fitModelToGround(object, targetSize = 2.8) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  object.scale.setScalar(targetSize / maxAxis)

  box.setFromObject(object)
  const center = box.getCenter(new THREE.Vector3())
  object.position.x += -center.x
  object.position.z += -center.z
  object.position.y += -box.min.y
}
