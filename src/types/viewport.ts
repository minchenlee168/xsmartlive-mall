export interface Viewport {
  id: 'mobile' | 'tablet' | 'pc';
  label: string;
  icon: string;
  width: number | null;
  /** 限制高度（null = 不限），模擬實機螢幕高度；frame 內容超過會內部 scroll */
  height: number | null;
}
