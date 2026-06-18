export interface Theme {
  id: string;
  label: string;
  /** 色票純色（顯示用） */
  swatch: string;
  /** 若為漸層主題，色票也顯示漸層 */
  swatchGradient?: string;
  vars: Record<string, string>;
}
