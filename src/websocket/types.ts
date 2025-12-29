// クライアント → サーバ
export interface ClientMessage {
  type: "event";
  widgetId: string;
  value: unknown;
}

// サーバ → クライアント
export interface ServerMessage {
  type: "patch";
  patches: Patch[];
}

export type Patch = ReplaceRootPatch;

export interface ReplaceRootPatch {
  type: "replaceRoot";
  html: string;
}
