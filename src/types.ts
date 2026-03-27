// Core data types for the Phaser Tilemap Maker

export interface TileRect {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TilesetData {
  name: string;
  imageUrl: string;        // data URL of the loaded image
  imageFileName: string;   // original file name
  tiles: TileRect[];
}

export interface PlacedTile {
  tileId: number;         // references TileRect.id
  col: number;            // grid column
  row: number;            // grid row
}

export interface MapLayer {
  name: string;
  tiles: PlacedTile[];
}

export interface MapConfig {
  mapWidth: number;   // number of columns
  mapHeight: number;  // number of rows
  tileWidth: number;  // display tile width in pixels
  tileHeight: number; // display tile height in pixels
}

export interface TilemapProject {
  version: string;
  config: MapConfig;
  tileset: TilesetData | null;
  layers: MapLayer[];
  activeLayerIndex: number;
}

export type Tool = 'place' | 'erase' | 'fill' | 'select';
