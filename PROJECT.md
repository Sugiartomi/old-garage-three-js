# try-three — shop scene

Referensi interaksi: [pmndrs shopping](https://pmndrs.github.io/examples/shopping/)

Teks di UI berbahasa Inggris. Scene memakai three.js langsung (bukan React Three Fiber).

## Alur

1. Katalog: `src/three/data/cars.js` (nama, harga, tahun, kondisi, deskripsi, url, posisi, rotasi, ukuran)
2. Scene: `src/three/scenes/ShopScene.js` (load GLB, raycast, outline, mode lot / detail)
3. Page: `src/pages/Home/Home.jsx` (judul, harga, panel detail, kredit)
4. AR: `src/components/ar/ArQr.jsx` + route `/ar/:id` di `src/pages/ArView/ArView.jsx`

## Hover

Raycaster mengenai kotak tak terlihat di tiap mobil.

- Stroke putih lewat `OutlinePass`. Mesh yang namanya mengandung `plane` (bayangan baked) tidak ikut di-outline.
- Harga tidak mengikuti kursor. React menaruhnya di kotak statis kanan bawah (`.price-dock`).

Geser pointer lebih dari 6px dihitung drag, bukan klik.

## Intro dan bumper

- Saat halaman pertama kali dibuka, bumper mengetik “Junk · Gems · Lot”, lalu logo OLD GARAGE muncul dan keluar. Lewati jika `prefers-reduced-motion` aktif.
- Judul kiri (OLD GARAGE + deskripsi) hanya hilang saat user benar-benar mengorbit kamera (`OrbitControls` `start`), bukan saat kursor sekadar bergerak.
- “Back to the lot” mengembalikan judul. Fade berikutnya baru terjadi setelah orbit berikutnya.

## Detail

Klik mobil: mobil itu pindah ke kiri, membesar (`DETAIL_SCALE` 1.15), dan panel deskripsi muncul di kanan. Latar tetap terlihat, tanpa blur.

- Kamera bebas setelah transisi. Lerp kamera hanya berjalan selama perpindahan mode.
- Mobil berputar pelan, berhenti saat kursor di atas mobil itu atau saat user mengorbit.
- `camera.setViewOffset` menaruh mobil di tengah area kiri, di luar panel.

## Lantai dan dinding

Dinding adalah warna datar `scene.background` (`#252830`). Lantai kotak sedikit lebih gelap (`#21242b`), `MeshBasicMaterial` dengan `toneMapped: false` supaya tidak digelapkan tone mapping.

## AR

Dari panel detail, satu mobil bisa dibuka di kamera.

- Layar lebar: kode QR di bawah deskripsi. Isinya URL `${origin}/ar/:id`. `localhost` tidak bisa dibuka dari ponsel — pakai alamat jaringan komputer (`server.host: true` di Vite).
- Layar sempit: kode QR disembunyikan. Yang tampil tombol “Open AR camera”, dengan catatan bahwa kamera AR ini untuk iPhone.
- Halaman `/ar/:id` memakai `@google/model-viewer`.
  - iPhone: Safari tidak mendukung WebXR `immersive-ar`. USDZ disiapkan sebelum ketukan (`GLTFLoader` + `USDZExporter`), lalu dibuka lewat `<a rel="ar">`. Sumbu terpanjang diskalakan ke 1,2 m dan mesh `plane` dibuang, supaya mobil tidak raksasa. Apple tetap memindai lantai sebelum menaruh model.
  - Android: `model-viewer.activateAR()`.
  - Komputer: tombol tidak menyalakan kamera. Pesan meminta user memindai QR dengan iPhone.

## Loading

Bumper selesai dulu. Judul landing, petunjuk, dan kredit baru muncul setelah minimal satu mobil sudah masuk ke scene. Tiap mobil yang belum selesai punya progress di spot-nya (lima mobil = lima progress). Progress hilang saat model itu tampil.

File GLB disimpan di Cache API browser (`old-garage-glb-v1`, lewat `src/three/utils/cacheGlb.js`). Kunjungan berikutnya tidak mengunduh file yang sama lagi. Scene WebGL tetap disusun ulang saat refresh, karena browser membuang konteks gambar, tapi penyusunannya memakai file yang sudah tersimpan.

## Kredit

Kiri bawah halaman lot:

- Portfolio of Tomi Sugiarto
- 3D design by Renafox3D @ Sketchfab

Di layar kecil, kredit disembunyikan saat panel detail terbuka.
