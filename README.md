# Christian Museum · Auditorium

A desktop first-person architectural walkthrough built with React, TypeScript, Vite, Three.js, React Three Fiber, Drei and Rapier. The auditorium model is exported from the supplied Blender scene as `public/models/hoitruong.glb`.

## Run

Use Node 22.12+ and npm. From this directory:

```sh
npm install
npm run dev
```

Open the printed local URL in a desktop browser with WebGL 2. Click the view or **Click to explore** to capture the mouse. Look with the mouse, walk with WASD and hold Shift for a brisk walk. Escape releases the pointer. Click again to resume.

## Build and deploy

```sh
npm run build
npm run preview
```

The build type-checks TypeScript and writes the static website to `dist/`. This project is configured to deploy automatically to GitHub Pages at `https://giarsl.github.io/giarmsu/` whenever you push to `main`. In the GitHub repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The first published link will work after the workflow finishes successfully. The workflow downloads the auditorium model from Git LFS before building.

## Publish to GitHub

The auditorium GLB is about 94 MB, so this repository tracks `.glb` assets with Git LFS. Install Git LFS, then from the project directory:

```sh
git lfs install
git init
git add .gitattributes
git add .
git commit -m "Add museum walkthrough"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Replace `USERNAME/REPOSITORY` with the GitHub repository you created. For Vercel, connect that repository and keep the build settings above.

## Scene and navigation

The imported auditorium is centered in the walkthrough. The visitor can use WASD and mouse-look on desktop. Floor and wall bounds, stair height profiles, and the second-floor landing are configured in `src/app/App.tsx` and `src/player/Player.tsx`.

## Replacing the auditorium in Blender

1. Work in meters (Metric, Unit Scale 1). Put the finished floor at Blender Z=0, the aisle along the Y axis and the stage toward Blender +Y. Keep all category origins on the same building datum.
2. Apply rotation and scale to exported meshes. Export selected objects as glTF Binary (.glb), with +Y Up enabled, normals, UVs and materials. The exporter maps Blender (X,Y,Z) to Three.js (X,Z,-Y). Leave the model at unit scale in the viewer.
3. Export architecture, furniture, exhibits and lighting geometry separately. Use Principled BSDF materials and packed textures. Emissive fixtures and baked surface shading can accompany separate runtime lights.
4. The supplied auditorium is loaded from `public/models/hoitruong.glb` through `MuseumModel` in `src/app/App.tsx`. Replace that URL to use another exported model. The existing Suspense boundary handles loading.
5. Supply collision boxes measured in model-local Three.js coordinates. Each specifies a center, three half-extents in meters and optional Euler rotation in radians. Model and proxies share the same parent offset. Provide a continuous floor, perimeter walls, stage and furniture proxies before testing. Split walls around doors to preserve openings. Keep detailed render meshes out of the collision solver. Irregular circulation surfaces may require separate simplified static mesh colliders.
6. Set the rear spawn and eye height in the player configuration when the real building datum changes. Keep the spawn inside a clear floor area.

Example floor-only category, using a 0.2 m slab with its top at Y=0:

```tsx
<MuseumModel url="/models/floor.glb" boxes={[
  { center: [0, -0.1, 0], halfExtents: [9, 0.1, 14] }
]} />
```
