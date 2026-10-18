// ---------- 鍵（公開鍵・秘密鍵・共通鍵） ----------

export const PUB_COLOR = "#1565c0";
export const PRIV_COLOR = "#2e7d32";
export const SYM_COLOR = "#ef6c00";

export type KeyId = "Apub" | "Apriv" | "Bpub" | "Bpriv" | "sym";

export interface KeyInfo {
  /** 鍵の持ち主（共通鍵は2人で同じものを持つ） */
  owner: "A" | "B" | null;
  kind: "pub" | "priv" | "sym";
  label: string;
  short: string;
  icon: string;
  color: string;
}

export const KEYS: Record<KeyId, KeyInfo> = {
  Apub: { owner: "A", kind: "pub", label: "Aさんの公開鍵", short: "A公開鍵", icon: "🔑", color: PUB_COLOR },
  Apriv: { owner: "A", kind: "priv", label: "Aさんの秘密鍵", short: "A秘密鍵", icon: "🗝️", color: PRIV_COLOR },
  Bpub: { owner: "B", kind: "pub", label: "Bさんの公開鍵", short: "B公開鍵", icon: "🔑", color: PUB_COLOR },
  Bpriv: { owner: "B", kind: "priv", label: "Bさんの秘密鍵", short: "B秘密鍵", icon: "🗝️", color: PRIV_COLOR },
  sym: { owner: null, kind: "sym", label: "共通鍵", short: "共通鍵", icon: "🔑", color: SYM_COLOR },
};

/** lockedBy の鍵で暗号化したものを、key で復号できるか（対になるもう一方の鍵だけ） */
export function canDecrypt(lockedBy: KeyId, key: KeyId) {
  if (lockedBy === "sym") return key === "sym";
  const a = KEYS[lockedBy];
  const b = KEYS[key];
  return a.owner === b.owner && a.kind !== b.kind && b.kind !== "sym";
}

/** 暗号文の見た目（中身が分からない文字の並び） */
export const CIPHER_TEXT = "7f#Qz!k9";
export const PLAIN_TEXT = "HELLO";
