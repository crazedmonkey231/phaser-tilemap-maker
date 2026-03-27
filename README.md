# Phaser Tilemap Maker

A browser-based tilemap editor for [Phaser](https://phaser.io/) games. Load a tileset image, define tile rects (supporting variable tile sizes), paint tiles onto a grid with snapping, manage multiple layers, then export your map as a ready-to-drop-in Phaser TypeScript class or Tiled-compatible JSON.

## Features

- **Load any tileset image** – PNG, JPEG, WebP, etc.
- **Custom tile rects** – drag to define tiles of any size from the spritesheet; edit the exact X/Y/W/H values afterwards.
- **Grid-snapped tile placement** – paint, erase, or flood-fill tiles on a configurable grid.
- **Multiple layers** – add/remove layers, paint on the active layer independently.
- **Zoom & pan** – mouse-wheel zoom and alt+drag pan on both the tileset and map canvases.
- **Export options**:
  - **Save JSON** – exports the full project as `.tilemap.json` (reimportable).
  - **Phaser Class** – exports a ready-to-use `*.ts` file you can drop straight into your Phaser project.
  - **Tiled JSON** – exports a Tiled-compatible `.json` that `scene.make.tilemap()` can load.
- **Import** – reload a previously saved `.tilemap.json` project.

## Getting Started

```bash
npm install
npm run dev      # start the Vite dev server (http://localhost:5173)
npm run build    # production build to /dist
npm run preview  # preview the production build
```

## Using the Editor

1. **Load Image** – click the *Load Image* button in the left panel and pick your tileset PNG.
2. **Define tiles** – drag rectangles on the tileset image to mark each tile. Right-click a rect to remove it. Fine-tune coordinates in the *Selected Tile* form below.
3. **Configure map** – set columns, rows, and tile display size in the right panel, then click *Apply*.
4. **Paint tiles** – select a tile from the *Tile Picker*, choose the *Place* tool, then click/drag on the central canvas.
5. **Layers** – add layers with *＋*, click a layer name to make it active.
6. **Export** – use the toolbar buttons to export your work.

## Using the Exported Phaser Class

After exporting with the **Phaser Class** button you get a `*Tilemap.ts` file.  
Copy it into your Phaser project alongside your tileset image and use it like this:

```typescript
import { MyTilemap } from './MyTilemap';

class GameScene extends Phaser.Scene {
  preload() {
    MyTilemap.preload(this);          // loads the tileset image
  }
  create() {
    const map = MyTilemap.create(this); // builds the tilemap
  }
}
```

Update `TILESET_URL` inside the generated class to match your asset path.
