import type { TilemapProject } from './types';

/**
 * ImportManager handles loading a previously exported .tilemap.json file
 * back into the editor.
 */
export class ImportManager {
  /**
   * Prompt the user to pick a .tilemap.json file and return the parsed project.
   */
  importFromFile(): Promise<TilemapProject> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.tilemap.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target!.result as string) as TilemapProject;
            this.validateProject(data);
            resolve(data);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      };
      input.click();
    });
  }

  /**
   * Parse a project from a JSON string.
   */
  parseJSON(json: string): TilemapProject {
    const data = JSON.parse(json) as TilemapProject;
    this.validateProject(data);
    return data;
  }

  private validateProject(data: TilemapProject): void {
    if (!data.version) throw new Error('Invalid tilemap file: missing version');
    if (!data.config) throw new Error('Invalid tilemap file: missing config');
    if (!Array.isArray(data.layers)) throw new Error('Invalid tilemap file: missing layers');
    if (typeof data.activeLayerIndex !== 'number') {
      data.activeLayerIndex = 0;
    }
    // Migrate older exports that might lack certain fields
    for (const layer of data.layers) {
      if (!Array.isArray(layer.tiles)) layer.tiles = [];
    }
  }
}
