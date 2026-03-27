import type { TilemapProject, PlacedTile, MapLayer, TilesetData, MapConfig, Tool } from './types';

/**
 * MapEditor manages the central map canvas.
 * It renders the grid, placed tiles, and handles user interactions
 * for tile placement, erasing, and filling.
 */
export class MapEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // View state
  private offsetX = 0;
  private offsetY = 0;
  private zoom = 1;

  // Interaction state
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private isDrawing = false;
  private lastDrawCell: { col: number; row: number } | null = null;

  // Project data
  private project: TilemapProject;
  private tilesetImage: HTMLImageElement | null = null;

  // Current tool and selected tile
  private tool: Tool = 'place';
  private selectedTileId: number | null = null;

  // Callbacks
  onProjectChanged: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, project: TilemapProject) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.project = project;
    this.attachEvents();
    this.centerView();
  }

  private attachEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private centerView(): void {
    const { config } = this.project;
    const mapPixelW = config.mapWidth * config.tileWidth;
    const mapPixelH = config.mapHeight * config.tileHeight;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.offsetX = (w - mapPixelW * this.zoom) / 2;
    this.offsetY = (h - mapPixelH * this.zoom) / 2;
  }

  private canvasToGrid(cx: number, cy: number): { col: number; row: number } {
    const { config } = this.project;
    const col = Math.floor((cx - this.offsetX) / (config.tileWidth * this.zoom));
    const row = Math.floor((cy - this.offsetY) / (config.tileHeight * this.zoom));
    return { col, row };
  }

  private isValidCell(col: number, row: number): boolean {
    const { config } = this.project;
    return col >= 0 && col < config.mapWidth && row >= 0 && row < config.mapHeight;
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const pos = this.getCanvasPos(e);

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or alt+click — pan
      this.isPanning = true;
      this.panStart = pos;
      return;
    }

    if (e.button === 2) {
      // Right click — erase
      const cell = this.canvasToGrid(pos.x, pos.y);
      if (this.isValidCell(cell.col, cell.row)) {
        this.eraseTile(cell.col, cell.row);
      }
      return;
    }

    if (e.button === 0) {
      this.isDrawing = true;
      const cell = this.canvasToGrid(pos.x, pos.y);
      if (this.isValidCell(cell.col, cell.row)) {
        this.applyTool(cell.col, cell.row);
        this.lastDrawCell = cell;
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (this.isPanning) {
      this.offsetX += pos.x - this.panStart.x;
      this.offsetY += pos.y - this.panStart.y;
      this.panStart = pos;
      this.render();
      return;
    }

    if (this.isDrawing) {
      const cell = this.canvasToGrid(pos.x, pos.y);
      if (this.isValidCell(cell.col, cell.row)) {
        const last = this.lastDrawCell;
        if (!last || last.col !== cell.col || last.row !== cell.row) {
          this.applyTool(cell.col, cell.row);
          this.lastDrawCell = cell;
        }
      }
      return;
    }

    // Just hover — re-render to show cursor highlight
    this.render(this.canvasToGrid(pos.x, pos.y));
  }

  private onMouseUp(e: MouseEvent): void {
    this.isPanning = false;
    this.isDrawing = false;
    this.lastDrawCell = null;
  }

  private onMouseLeave(): void {
    this.isPanning = false;
    this.isDrawing = false;
    this.lastDrawCell = null;
    this.render();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const pos = this.getCanvasPos(e);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.25, Math.min(8, this.zoom * factor));

    // Zoom toward mouse position
    this.offsetX = pos.x - (pos.x - this.offsetX) * (newZoom / this.zoom);
    this.offsetY = pos.y - (pos.y - this.offsetY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    this.render();
  }

  private applyTool(col: number, row: number): void {
    switch (this.tool) {
      case 'place':
        this.placeTile(col, row);
        break;
      case 'erase':
        this.eraseTile(col, row);
        break;
      case 'fill':
        this.fillArea(col, row);
        break;
    }
  }

  private getActiveLayer(): MapLayer | null {
    const idx = this.project.activeLayerIndex;
    return this.project.layers[idx] ?? null;
  }

  private placeTile(col: number, row: number): void {
    const layer = this.getActiveLayer();
    if (!layer || this.selectedTileId === null) return;

    // Remove existing tile at this cell
    layer.tiles = layer.tiles.filter((t) => t.col !== col || t.row !== row);
    layer.tiles.push({ tileId: this.selectedTileId, col, row });
    this.onProjectChanged?.();
    this.render();
  }

  private eraseTile(col: number, row: number): void {
    const layer = this.getActiveLayer();
    if (!layer) return;
    layer.tiles = layer.tiles.filter((t) => t.col !== col || t.row !== row);
    this.onProjectChanged?.();
    this.render();
  }

  private fillArea(col: number, row: number): void {
    const layer = this.getActiveLayer();
    if (!layer || this.selectedTileId === null) return;
    if (!this.isValidCell(col, row)) return;

    // Get the tile at the starting cell
    const existing = layer.tiles.find((t) => t.col === col && t.row === row);
    const targetTileId = existing ? existing.tileId : null;

    // BFS flood fill
    const visited = new Set<string>();
    const queue: { col: number; row: number }[] = [{ col, row }];
    const key = (c: number, r: number) => `${c},${r}`;

    while (queue.length > 0) {
      const cell = queue.shift()!;
      const k = key(cell.col, cell.row);
      if (visited.has(k)) continue;
      visited.add(k);

      if (!this.isValidCell(cell.col, cell.row)) continue;

      const found = layer.tiles.find((t) => t.col === cell.col && t.row === cell.row);
      const currentId = found ? found.tileId : null;
      if (currentId !== targetTileId) continue;

      // Place the tile
      layer.tiles = layer.tiles.filter((t) => t.col !== cell.col || t.row !== cell.row);
      layer.tiles.push({ tileId: this.selectedTileId, col: cell.col, row: cell.row });

      queue.push({ col: cell.col - 1, row: cell.row });
      queue.push({ col: cell.col + 1, row: cell.row });
      queue.push({ col: cell.col, row: cell.row - 1 });
      queue.push({ col: cell.col, row: cell.row + 1 });
    }

    this.onProjectChanged?.();
    this.render();
  }

  setTileset(tileset: TilesetData | null): void {
    if (!tileset) {
      this.tilesetImage = null;
      this.render();
      return;
    }
    const img = new Image();
    img.onload = () => {
      this.tilesetImage = img;
      this.render();
    };
    img.src = tileset.imageUrl;
  }

  setProject(project: TilemapProject): void {
    this.project = project;
    this.centerView();
    if (project.tileset) {
      this.setTileset(project.tileset);
    } else {
      this.tilesetImage = null;
    }
    this.render();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
  }

  setSelectedTileId(id: number | null): void {
    this.selectedTileId = id;
  }

  resetView(): void {
    this.zoom = 1;
    this.centerView();
    this.render();
  }

  render(hoverCell?: { col: number; row: number }): void {
    const { width, height } = this.canvas;
    const { config, layers } = this.project;

    this.ctx.clearRect(0, 0, width, height);

    // Background
    this.ctx.fillStyle = '#2a2a2a';
    this.ctx.fillRect(0, 0, width, height);

    const tw = config.tileWidth * this.zoom;
    const th = config.tileHeight * this.zoom;
    const mapW = config.mapWidth * tw;
    const mapH = config.mapHeight * th;

    // Map background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(this.offsetX, this.offsetY, mapW, mapH);

    // Draw placed tiles for each layer
    for (const layer of layers) {
      for (const placed of layer.tiles) {
        const tile = this.project.tileset?.tiles.find((t) => t.id === placed.tileId);
        if (!tile || !this.tilesetImage) continue;

        const px = this.offsetX + placed.col * tw;
        const py = this.offsetY + placed.row * th;

        this.ctx.drawImage(
          this.tilesetImage,
          tile.x, tile.y, tile.width, tile.height,
          px, py, tw, th,
        );
      }
    }

    // Draw grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 0.5;
    for (let col = 0; col <= config.mapWidth; col++) {
      const x = this.offsetX + col * tw;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.offsetY);
      this.ctx.lineTo(x, this.offsetY + mapH);
      this.ctx.stroke();
    }
    for (let row = 0; row <= config.mapHeight; row++) {
      const y = this.offsetY + row * th;
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, y);
      this.ctx.lineTo(this.offsetX + mapW, y);
      this.ctx.stroke();
    }

    // Map border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(this.offsetX, this.offsetY, mapW, mapH);

    // Draw hover highlight
    if (hoverCell && this.isValidCell(hoverCell.col, hoverCell.row)) {
      const px = this.offsetX + hoverCell.col * tw;
      const py = this.offsetY + hoverCell.row * th;
      this.ctx.fillStyle = this.tool === 'erase'
        ? 'rgba(255, 50, 50, 0.3)'
        : 'rgba(255, 255, 100, 0.25)';
      this.ctx.fillRect(px, py, tw, th);
      this.ctx.strokeStyle = this.tool === 'erase' ? '#ff3232' : '#ffff64';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(px, py, tw, th);
    }
  }
}
