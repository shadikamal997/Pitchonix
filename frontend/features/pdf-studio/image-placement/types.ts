export interface PlacedImage {
  id: string;
  url: string;
  x: number;      // % of page width from left (0–100)
  y: number;      // % of page height from top (0–100)
  width: number;  // % of page width
  height: number; // % of page height
  zIndex?: number;
  opacity?: number;
  fit?: 'cover' | 'contain' | 'fill';
}
