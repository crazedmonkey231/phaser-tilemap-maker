import type { TilesetData, TileRect } from './types';

/**
 * TilesetPanel manages the left-hand tileset image panel.
 * It lets users load a tileset image, define tile rects by dragging,
 * and select a tile to paint on the map.
 */
export class TilesetPanel {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private tileset: TilesetData | null = null;

  // Drag state for defining a new tile rect
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragCurrent = { x: 0, y: 0 };

  // Currently selected tile
  private selectedTileId: number | null = null;
  private nextTileId = 0;

  // Scroll offset for the tileset image
  private scrollX = 0;
  private scrollY = 0;
  private scale = 1;

  // Scrollbar elements
  private hScrollbar: HTMLInputElement | null = null;
  private vScrollbar: HTMLInputElement | null = null;

  // Callbacks
  onTileSelected: ((tileId: number) => void) | null = null;
  onTilesetChanged: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.attachEvents();
  }

  private attachEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / this.scale - this.scrollX / this.scale,
      y: (e.clientY - rect.top) / this.scale - this.scrollY / this.scale,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    if (!this.image) return;
    const pos = this.getCanvasPos(e);

    if (e.button === 2) {
      // Right click — delete tile under cursor
      const tile = this.getTileAt(pos.x, pos.y);
      if (tile && this.tileset) {
        this.tileset.tiles = this.tileset.tiles.filter((t) => t.id !== tile.id);
        if (this.selectedTileId === tile.id) {
          this.selectedTileId = null;
        }
        this.render();
        this.onTilesetChanged?.();
      }
      return;
    }

    // Left click — check if clicking an existing tile (select) or start dragging (new tile)
    const existingTile = this.getTileAt(pos.x, pos.y);
    if (existingTile) {
      this.selectedTileId = existingTile.id;
      this.onTileSelected?.(existingTile.id);
      this.render();
      return;
    }

    // Start drag to define new tile rect
    this.isDragging = true;
    this.dragStart = pos;
    this.dragCurrent = pos;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.dragCurrent = this.getCanvasPos(e);
    this.render();
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const x = Math.min(this.dragStart.x, this.dragCurrent.x);
    const y = Math.min(this.dragStart.y, this.dragCurrent.y);
    const w = Math.abs(this.dragCurrent.x - this.dragStart.x);
    const h = Math.abs(this.dragCurrent.y - this.dragStart.y);

    if (w > 2 && h > 2 && this.tileset) {
      const id = this.nextTileId++;
      const newTile: TileRect = {
        id,
        name: `tile_${id}`,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
      };
      this.tileset.tiles.push(newTile);
      this.selectedTileId = newTile.id;
      this.onTileSelected?.(newTile.id);
      this.onTilesetChanged?.();
    }
    this.render();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (e.ctrlKey) {
      // Zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.max(0.2, Math.min(4, this.scale * delta));
    } else if (e.shiftKey) {
      // Horizontal scroll
      this.scrollX -= e.deltaY;
    } else {
      // Vertical scroll
      this.scrollY -= e.deltaY;
    }
    this.clampScroll();
    this.render();
  }

  private clampScroll(): void {
    if (!this.image) {
      this.scrollX = 0;
      this.scrollY = 0;
      return;
    }
    const maxScrollX = Math.max(0, this.image.width * this.scale - this.canvas.width);
    const maxScrollY = Math.max(0, this.image.height * this.scale - this.canvas.height);
    this.scrollX = Math.min(0, Math.max(-maxScrollX, this.scrollX));
    this.scrollY = Math.min(0, Math.max(-maxScrollY, this.scrollY));
  }

  attachScrollbars(hScroll: HTMLInputElement, vScroll: HTMLInputElement): void {
    this.hScrollbar = hScroll;
    this.vScrollbar = vScroll;
    hScroll.addEventListener('input', () => {
      this.scrollX = -parseInt(hScroll.value, 10);
      this.render();
    });
    vScroll.addEventListener('input', () => {
      this.scrollY = -parseInt(vScroll.value, 10);
      this.render();
    });
  }

  private updateScrollbars(): void {
    if (!this.hScrollbar || !this.vScrollbar || !this.image) return;
    const maxScrollX = Math.max(0, Math.round(this.image.width * this.scale - this.canvas.width));
    const maxScrollY = Math.max(0, Math.round(this.image.height * this.scale - this.canvas.height));
    this.hScrollbar.max = String(maxScrollX);
    this.hScrollbar.value = String(Math.round(-this.scrollX));
    this.vScrollbar.max = String(maxScrollY);
    this.vScrollbar.value = String(Math.round(-this.scrollY));
  }

  private getTileAt(x: number, y: number): TileRect | null {
    if (!this.tileset) return null;
    for (const tile of this.tileset.tiles) {
      if (x >= tile.x && x <= tile.x + tile.width &&
          y >= tile.y && y <= tile.y + tile.height) {
        return tile;
      }
    }
    return null;
  }

  loadImage(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.image = img;
          this.tileset = {
            name: file.name.replace(/\.[^.]+$/, ''),
            imageUrl: e.target!.result as string,
            imageFileName: file.name,
            tiles: [],
          };
          this.nextTileId = 0;
          this.selectedTileId = null;
          this.scrollX = 0;
          this.scrollY = 0;
          this.scale = 1;
          this.resizeCanvas();
          this.render();
          this.onTilesetChanged?.();
          resolve();
        };
        img.onerror = reject;
        img.src = e.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private resizeCanvas(): void {
    if (!this.image) return;
    // Keep canvas at its CSS size but ensure it renders correctly
    this.render();
  }

  getTileset(): TilesetData | null {
    return this.tileset;
  }

  getSelectedTileId(): number | null {
    return this.selectedTileId;
  }

  setSelectedTileId(id: number | null): void {
    this.selectedTileId = id;
    this.render();
  }

  loadTileset(tileset: TilesetData): void {
    this.tileset = tileset;
    this.nextTileId = tileset.tiles.length > 0
      ? Math.max(...tileset.tiles.map((t) => t.id)) + 1
      : 0;
    this.selectedTileId = null;

    const img = new Image();
    img.onload = () => {
      this.image = img;
      this.scale = 1;
      this.scrollX = 0;
      this.scrollY = 0;
      this.render();
    };
    img.src = tileset.imageUrl;
  }

  renameTile(id: number, name: string): void {
    if (!this.tileset) return;
    const tile = this.tileset.tiles.find((t) => t.id === id);
    if (tile) {
      tile.name = name;
      this.onTilesetChanged?.();
    }
  }

  render(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw checkerboard background
    const size = 16;
    for (let x = 0; x < width; x += size) {
      for (let y = 0; y < height; y += size) {
        this.ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0
          ? '#c8c8c8' : '#f0f0f0';
        this.ctx.fillRect(x, y, size, size);
      }
    }

    if (!this.image) {
      this.ctx.fillStyle = '#999';
      this.ctx.font = '14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Load a tileset image to get started', width / 2, height / 2);
      return;
    }

    this.ctx.save();
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(this.scrollX / this.scale, this.scrollY / this.scale);

    // Draw tileset image
    this.ctx.drawImage(this.image, 0, 0);

    // Draw defined tile rects
    if (this.tileset) {
      for (const tile of this.tileset.tiles) {
        const isSelected = tile.id === this.selectedTileId;
        this.ctx.strokeStyle = isSelected ? '#ff6600' : '#00aaff';
        this.ctx.lineWidth = isSelected ? 2 / this.scale : 1 / this.scale;
        this.ctx.fillStyle = isSelected ? 'rgba(255, 102, 0, 0.15)' : 'rgba(0, 170, 255, 0.1)';
        this.ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        this.ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);

        // Tile ID label
        this.ctx.fillStyle = isSelected ? '#ff6600' : '#0066cc';
        this.ctx.font = `${10 / this.scale}px sans-serif`;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`#${tile.id}`, tile.x + 2 / this.scale, tile.y + 11 / this.scale);
      }
    }

    // Draw current drag selection
    if (this.isDragging) {
      const x = Math.min(this.dragStart.x, this.dragCurrent.x);
      const y = Math.min(this.dragStart.y, this.dragCurrent.y);
      const w = Math.abs(this.dragCurrent.x - this.dragStart.x);
      const h = Math.abs(this.dragCurrent.y - this.dragStart.y);
      this.ctx.strokeStyle = '#00ff00';
      this.ctx.lineWidth = 1.5 / this.scale;
      this.ctx.setLineDash([4 / this.scale, 4 / this.scale]);
      this.ctx.strokeRect(x, y, w, h);
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      this.ctx.fillRect(x, y, w, h);
    }

    this.ctx.restore();
    this.updateScrollbars();
  }
}
