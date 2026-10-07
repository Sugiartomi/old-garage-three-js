import rustyCarUrl from '../../assets/old_rusty_car.glb?url'
import gmcUrl from '../../assets/gmc_sierra_work_truck.glb?url'
import jeepUrl from '../../assets/jeep_cherokee.glb?url'
import destroyerUrl from '../../assets/destroyed_car_03__backrooms_car_gameready_ver.glb?url'
import dirtyLadaUrl from '../../assets/dirty_lada_lowpoly_from_scan.glb?url'

/**
 * Katalog produk
 * - position / rotationY / size: layout lot
 * - description: teks panel detail
 */
export const CARS = [
  {
    id: 'rusty',
    name: 'Old Rusty Car',
    price: '$4,200',
    url: rustyCarUrl,
    position: [-0.5, 0, 1.3],
    rotationY: 42,
    size: 4,
    year: '1978',
    condition: 'Restoration project',
    description:
      'This 1978 sedan keeps its classic silhouette, with rust that has become part of the body. The engine still turns over, while the panels and paint need a full restoration. It is meant for a collector working a long project, not for someone looking for a car that is ready to drive.',
  },
  {
    id: 'gmc',
    name: 'GMC Sierra',
    price: '$38,900',
    url: gmcUrl,
    position: [0.4, 0, -1.2],
    rotationY: 198,
    size: 3.6,
    year: '2014',
    condition: 'Work ready',
    description:
      'This 2014 GMC Sierra is set up as a working truck. The bed is still wide, the cab is relatively tidy, and the truck remains fit for hard daily use. It suits hauling and field work, with service notes that can be reviewed at inspection.',
  },
  {
    id: 'jeep',
    name: 'Jeep Cherokee',
    price: '$29,500',
    url: jeepUrl,
    position: [2.0, 0, 0.8],
    rotationY: -58,
    size: 2.6,
    year: '1999',
    condition: 'Fair',
    description:
      'This 1999 Jeep Cherokee keeps the proportions and ground clearance that define its generation. The high suspension still makes sense on rough roads, though age shows on several panels. Condition is fair for the year, and it is better as a light trail vehicle than a show car.',
  },
  {
    id: 'dodge',
    name: 'Wreck Yard Special',
    price: '$1,150',
    url: destroyerUrl,
    position: [5.0, 0, 0.8],
    rotationY: -58,
    size: 3.0,
    year: '—',
    condition: 'Parts only',
    description:
      'This vehicle is no longer fit to drive. The body is kept as a study piece and a display object: the structure, joints, and remaining parts can still be read. Its value is in spare parts and visual character, not in transport.',
  },
  {
    id: 'ford',
    name: 'Dirty Lada',
    price: '$3,800',
    url: dirtyLadaUrl,
    position: [3.15, 0, 2],
    rotationY: -32,
    size: 2.2,
    year: '1986',
    condition: 'Runner',
    description:
      'This 1986 Dirty Lada comes from a scan of a real car, so the proportions and wear were left as found. It still runs, with a finish that is honest about its age. It suits someone looking for a low-budget daily driver whose history is still visible on the body.',
  },
]
