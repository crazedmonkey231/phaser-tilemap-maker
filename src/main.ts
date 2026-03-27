import './styles.css';
import { TilesetPanel } from './TilesetPanel';
import { MapEditor } from './MapEditor';
import { ExportManager } from './ExportManager';
import { ImportManager } from './ImportManager';
import type { TilemapProject, Tool, MapLayer } from './types';

// ─── Default project ────────────────────────────────────────────────────────

function createDefaultProject(): TilemapProject {
  return {
    version: '1.0',
    config: {
      mapWidth: 20,
      mapHeight: 15,
      tileWidth: 32,
      tileHeight: 32,
    },
    tileset: null,
    layers: [{ name: 'Layer 1', tiles: [] }],
    activeLayerIndex: 0,
  };
}

let project: TilemapProject = createDefaultProject();
const exportManager = new ExportManager();
const importManager = new ImportManager();

// ─── Canvas setup ────────────────────────────────────────────────────────────

const tilesetCanvas = document.getElementById('tileset-canvas') as HTMLCanvasElement;
const mapCanvas = document.getElementById('map-canvas') as HTMLCanvasElement;

const tilesetPanel = new TilesetPanel(tilesetCanvas);
const mapEditor = new MapEditor(mapCanvas, project);

const tilesetHScroll = document.getElementById('tileset-hscroll') as HTMLInputElement;
const tilesetVScroll = document.getElementById('tileset-vscroll') as HTMLInputElement;
tilesetPanel.attachScrollbars(tilesetHScroll, tilesetVScroll);

// ─── Tile property form ──────────────────────────────────────────────────────

const tileNameInput = document.getElementById('tile-name') as HTMLInputElement;
const tileXInput = document.getElementById('tile-x') as HTMLInputElement;
const tileYInput = document.getElementById('tile-y') as HTMLInputElement;
const tileWInput = document.getElementById('tile-w') as HTMLInputElement;
const tileHInput = document.getElementById('tile-h') as HTMLInputElement;
const tileIdDisplay = document.getElementById('tile-id-display') as HTMLSpanElement;
const tilePropsForm = document.getElementById('tile-props') as HTMLDivElement;
const noTileMessage = document.getElementById('no-tile-selected') as HTMLParagraphElement;

function updateTileProps(tileId: number | null): void {
  if (tileId === null || !project.tileset) {
    tilePropsForm.style.display = 'none';
    noTileMessage.style.display = '';
    return;
  }
  const tile = project.tileset.tiles.find((t) => t.id === tileId);
  if (!tile) {
    tilePropsForm.style.display = 'none';
    noTileMessage.style.display = '';
    return;
  }
  tilePropsForm.style.display = '';
  noTileMessage.style.display = 'none';
  tileIdDisplay.textContent = String(tile.id);
  tileNameInput.value = tile.name;
  tileXInput.value = String(tile.x);
  tileYInput.value = String(tile.y);
  tileWInput.value = String(tile.width);
  tileHInput.value = String(tile.height);
}

function applyTileProps(): void {
  const selectedId = tilesetPanel.getSelectedTileId();
  if (selectedId === null || !project.tileset) return;
  const tile = project.tileset.tiles.find((t) => t.id === selectedId);
  if (!tile) return;
  tile.name = tileNameInput.value || tile.name;
  tile.x = parseInt(tileXInput.value, 10) || tile.x;
  tile.y = parseInt(tileYInput.value, 10) || tile.y;
  tile.width = parseInt(tileWInput.value, 10) || tile.width;
  tile.height = parseInt(tileHInput.value, 10) || tile.height;
  tilesetPanel.render();
  mapEditor.setTileset(project.tileset);
}

[tileNameInput, tileXInput, tileYInput, tileWInput, tileHInput].forEach((el) => {
  el.addEventListener('change', applyTileProps);
});

// ─── Tileset panel callbacks ─────────────────────────────────────────────────

tilesetPanel.onTileSelected = (id) => {
  mapEditor.setSelectedTileId(id);
  updateTileProps(id);
  renderTileList();
};

tilesetPanel.onTilesetChanged = () => {
  project.tileset = tilesetPanel.getTileset();
  mapEditor.setTileset(project.tileset);
  renderTileList();
  updateTileProps(tilesetPanel.getSelectedTileId());
};

// ─── Map editor callback ─────────────────────────────────────────────────────

mapEditor.onProjectChanged = () => {
  // Project tiles are mutated directly by the editor; nothing extra needed here.
};

// ─── Resize canvases ─────────────────────────────────────────────────────────

function resizeCanvases(): void {
  const tilesetCanvasArea = document.getElementById('tileset-canvas-area')!;
  tilesetCanvas.width = tilesetCanvasArea.clientWidth - tilesetVScroll.offsetWidth;
  tilesetCanvas.height = tilesetCanvasArea.clientHeight;

  const mapContainer = document.getElementById('map-container')!;
  mapCanvas.width = mapContainer.clientWidth;
  mapCanvas.height = mapContainer.clientHeight;

  tilesetPanel.render();
  mapEditor.render();
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// ─── Tool buttons ─────────────────────────────────────────────────────────────

const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-tool]');
toolButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool as Tool;
    mapEditor.setTool(tool);
    toolButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ─── Load tileset image ───────────────────────────────────────────────────────

const loadImageBtn = document.getElementById('load-image-btn') as HTMLLabelElement;
const imageFileInput = document.getElementById('image-file-input') as HTMLInputElement;
imageFileInput.addEventListener('change', async () => {
  const file = imageFileInput.files?.[0];
  if (!file) return;
  try {
    await tilesetPanel.loadImage(file);
    project.tileset = tilesetPanel.getTileset();
    mapEditor.setTileset(project.tileset);
    renderTileList();
    showStatus(`Loaded "${file.name}"`);
  } catch {
    showStatus('Failed to load image', true);
  }
});

// ─── Map config ───────────────────────────────────────────────────────────────

const mapWidthInput = document.getElementById('map-width') as HTMLInputElement;
const mapHeightInput = document.getElementById('map-height') as HTMLInputElement;
const tileWidthInput = document.getElementById('tile-width') as HTMLInputElement;
const tileHeightInput = document.getElementById('tile-height') as HTMLInputElement;

function syncConfigInputs(): void {
  mapWidthInput.value = String(project.config.mapWidth);
  mapHeightInput.value = String(project.config.mapHeight);
  tileWidthInput.value = String(project.config.tileWidth);
  tileHeightInput.value = String(project.config.tileHeight);
}
syncConfigInputs();

document.getElementById('apply-config-btn')!.addEventListener('click', () => {
  project.config.mapWidth = Math.max(1, parseInt(mapWidthInput.value, 10) || 20);
  project.config.mapHeight = Math.max(1, parseInt(mapHeightInput.value, 10) || 15);
  project.config.tileWidth = Math.max(1, parseInt(tileWidthInput.value, 10) || 32);
  project.config.tileHeight = Math.max(1, parseInt(tileHeightInput.value, 10) || 32);
  syncConfigInputs();
  mapEditor.setProject(project);
  showStatus('Map config applied');
});

document.getElementById('reset-view-btn')!.addEventListener('click', () => {
  mapEditor.resetView();
});

// ─── Layers ───────────────────────────────────────────────────────────────────

const layerList = document.getElementById('layer-list') as HTMLDivElement;

function renderLayerList(): void {
  layerList.innerHTML = '';
  project.layers.forEach((layer, idx) => {
    const div = document.createElement('div');
    div.className = 'layer-item' + (idx === project.activeLayerIndex ? ' active' : '');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = layer.name;
    nameSpan.style.flex = '1';
    nameSpan.style.cursor = 'pointer';
    nameSpan.addEventListener('click', () => {
      project.activeLayerIndex = idx;
      renderLayerList();
    });

    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'icon-btn';
    delBtn.title = 'Delete layer';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (project.layers.length <= 1) {
        showStatus('Cannot delete the last layer', true);
        return;
      }
      project.layers.splice(idx, 1);
      if (project.activeLayerIndex >= project.layers.length) {
        project.activeLayerIndex = project.layers.length - 1;
      }
      renderLayerList();
      mapEditor.render();
    });

    div.appendChild(nameSpan);
    div.appendChild(delBtn);
    layerList.appendChild(div);
  });
}

document.getElementById('add-layer-btn')!.addEventListener('click', () => {
  const newLayer: MapLayer = { name: `Layer ${project.layers.length + 1}`, tiles: [] };
  project.layers.push(newLayer);
  project.activeLayerIndex = project.layers.length - 1;
  renderLayerList();
});

renderLayerList();

// ─── Tile list ────────────────────────────────────────────────────────────────

const tileList = document.getElementById('tile-list') as HTMLDivElement;

function renderTileList(): void {
  tileList.innerHTML = '';
  const tiles = project.tileset?.tiles ?? [];
  if (tiles.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No tiles defined yet.';
    p.className = 'hint-text';
    tileList.appendChild(p);
    return;
  }
  tiles.forEach((tile) => {
    const btn = document.createElement('button');
    btn.className = 'tile-btn' + (tile.id === tilesetPanel.getSelectedTileId() ? ' active' : '');
    btn.title = `${tile.name} (${tile.width}×${tile.height})`;

    // Mini canvas showing the tile
    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 40;
    miniCanvas.height = 40;
    const mCtx = miniCanvas.getContext('2d')!;
    if (project.tileset) {
      const img = new Image();
      img.onload = () => {
        mCtx.clearRect(0, 0, 40, 40);
        const scale = Math.min(40 / tile.width, 40 / tile.height);
        const dw = tile.width * scale;
        const dh = tile.height * scale;
        mCtx.drawImage(img, tile.x, tile.y, tile.width, tile.height,
          (40 - dw) / 2, (40 - dh) / 2, dw, dh);
      };
      img.src = project.tileset.imageUrl;
    }

    const label = document.createElement('span');
    label.textContent = tile.name;

    btn.appendChild(miniCanvas);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      tilesetPanel.setSelectedTileId(tile.id);
      mapEditor.setSelectedTileId(tile.id);
      updateTileProps(tile.id);
      renderTileList();
    });

    tileList.appendChild(btn);
  });
}

// ─── Export buttons ───────────────────────────────────────────────────────────

document.getElementById('export-json-btn')!.addEventListener('click', () => {
  exportManager.exportJSON(project);
  showStatus('Exported tilemap JSON');
});

document.getElementById('export-phaser-btn')!.addEventListener('click', () => {
  if (!project.tileset) {
    showStatus('Load a tileset image first', true);
    return;
  }
  exportManager.exportPhaserClass(project);
  showStatus('Exported Phaser TileMap class');
});

document.getElementById('export-tiled-btn')!.addEventListener('click', () => {
  exportManager.exportTiledJSON(project);
  showStatus('Exported Tiled-compatible JSON');
});

// ─── Import button ────────────────────────────────────────────────────────────

document.getElementById('import-btn')!.addEventListener('click', async () => {
  try {
    const imported = await importManager.importFromFile();
    project = imported;
    syncConfigInputs();
    renderLayerList();
    renderTileList();
    updateTileProps(null);
    if (project.tileset) {
      tilesetPanel.loadTileset(project.tileset);
    }
    mapEditor.setProject(project);
    showStatus('Project imported successfully');
  } catch (err) {
    showStatus(`Import failed: ${(err as Error).message}`, true);
  }
});

// ─── New project ──────────────────────────────────────────────────────────────

document.getElementById('new-project-btn')!.addEventListener('click', () => {
  if (!confirm('Start a new project? Unsaved changes will be lost.')) return;
  project = createDefaultProject();
  syncConfigInputs();
  renderLayerList();
  renderTileList();
  updateTileProps(null);
  tilesetPanel.render();
  mapEditor.setProject(project);
  showStatus('New project created');
});

// ─── Status bar ───────────────────────────────────────────────────────────────

const statusBar = document.getElementById('status-bar') as HTMLSpanElement;
let statusTimeout: ReturnType<typeof setTimeout> | null = null;

function showStatus(msg: string, isError = false): void {
  statusBar.textContent = msg;
  statusBar.style.color = isError ? '#ff6060' : '#aaffaa';
  if (statusTimeout) clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => { statusBar.textContent = 'Ready'; statusBar.style.color = ''; }, 3000);
}

showStatus('Ready');
