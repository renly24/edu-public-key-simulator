// ---------- 送受信の場面（Aさん ⇄ Bさん、間で盗聴者がのぞき見る） ----------

import type { KeyId } from "./keys";

export type Who = "a" | "b" | "eve";
export type PacketKind = "plain" | "cipher" | "pubkey" | "sym";

export interface Bubble {
  text: string;
  /** 困ったこと（読まれた・鍵を取られた）を赤で表示する */
  alert?: boolean;
}

export type KeyRing = Partial<Record<Who, KeyId[]>>;

export interface TransferStep {
  /** 下に出す説明 */
  text: string;
  /** このステップで流れるもの（dir が "toA" なら B → A、ふだんは A → B） */
  packet?: { label: string; kind: PacketKind; dir?: "toA" };
  /** 盗聴者が流れたものをコピーする */
  tapped?: boolean;
  bubbles?: Partial<Record<Who, Bubble>>;
  /** このステップの時点で、だれがどの鍵を持っているか */
  keys?: KeyRing;
}

export interface TransferScene {
  caption: string;
  intro: string;
  /** はじめにだれがどの鍵を持っているか */
  keys: KeyRing;
  steps: TransferStep[];
}

export type SceneId = "symleak" | "public" | "selfpriv";

export const SCENES: Record<SceneId, TransferScene> = {
  symleak: {
    caption: "共通鍵暗号方式で、鍵も通信路で送ると",
    intro: "共通鍵暗号方式のふり返りです。Aさんしか共通鍵を持っていないので、Aさんは共通鍵もインターネットで送ることにしました。",
    keys: { a: ["sym"] },
    steps: [
      {
        text: "Aさんは、Bさんに共通鍵を送りました。盗聴者は、流れてきた共通鍵もコピーできてしまいます。",
        packet: { label: "🔑 共通鍵", kind: "sym" },
        tapped: true,
        keys: { a: ["sym"], b: ["sym"], eve: ["sym"] },
        bubbles: { b: { text: "共通鍵を受け取った" }, eve: { text: "共通鍵を手に入れた！", alert: true } },
      },
      {
        text: "Aさんは、共通鍵で暗号化した暗号文を送りました。盗聴者は、これもコピーします。",
        packet: { label: "暗号文", kind: "cipher" },
        tapped: true,
        keys: { a: ["sym"], b: ["sym"], eve: ["sym"] },
      },
      {
        text: "Bさんは共通鍵で復号できました。でも、同じ共通鍵を持っている盗聴者も復号できてしまいます。",
        packet: { label: "暗号文", kind: "cipher" },
        tapped: true,
        keys: { a: ["sym"], b: ["sym"], eve: ["sym"] },
        bubbles: { b: { text: "復号できた" }, eve: { text: "復号できた！", alert: true } },
      },
    ],
  },
  public: {
    caption: "公開鍵暗号方式で送ると",
    intro: "Aさん（送信者）が、Bさん（受信者）に秘密のメッセージを送ります。まず、受信者の Bさんが準備をします。",
    keys: {},
    steps: [
      {
        text: "① Bさんが、公開鍵と秘密鍵のペアを作りました。秘密鍵は Bさんだけが持ち、だれにももらしません。",
        keys: { b: ["Bpub", "Bpriv"] },
        bubbles: { b: { text: "鍵のペアを作った" } },
      },
      {
        text: "② Aさんが、Bさんの公開鍵を手に入れました。公開鍵は、だれが手に入れてもよい鍵です。盗聴者にコピーされても困りません。",
        packet: { label: "🔑 B公開鍵", kind: "pubkey", dir: "toA" },
        tapped: true,
        keys: { a: ["Bpub"], b: ["Bpub", "Bpriv"], eve: ["Bpub"] },
        bubbles: { a: { text: "B公開鍵を手に入れた" } },
      },
      {
        text: "③ Aさんは、Bさんの公開鍵を使って、平文を暗号化しました。",
        keys: { a: ["Bpub"], b: ["Bpub", "Bpriv"], eve: ["Bpub"] },
        bubbles: { a: { text: "B公開鍵で暗号化" } },
      },
      {
        text: "④ ネットワーク上を、暗号文の状態で送ります。盗聴者はコピーしましたが、Bさんの公開鍵では復号できません。",
        packet: { label: "暗号文", kind: "cipher" },
        tapped: true,
        keys: { a: ["Bpub"], b: ["Bpub", "Bpriv"], eve: ["Bpub"] },
        bubbles: { eve: { text: "公開鍵では復号できない…" } },
      },
      {
        text: "⑤ Bさんは、自分の秘密鍵で復号して、平文を得ました。秘密鍵を持っているのは Bさんだけです。",
        packet: { label: "暗号文", kind: "cipher" },
        tapped: true,
        keys: { a: ["Bpub"], b: ["Bpub", "Bpriv"], eve: ["Bpub"] },
        bubbles: { b: { text: "B秘密鍵で復号できた" }, eve: { text: "公開鍵では復号できない…" } },
      },
    ],
  },
  selfpriv: {
    caption: "送信者が自分の秘密鍵で暗号化すると",
    intro: "今度は、Aさんが自分の秘密鍵でメッセージを暗号化して送ります。Aさんの公開鍵は、インターネットで公開されています。",
    keys: { a: ["Apub", "Apriv"], b: ["Apub"], eve: ["Apub"] },
    steps: [
      {
        text: "Aさんは、自分の秘密鍵で平文を暗号化しました。",
        keys: { a: ["Apub", "Apriv"], b: ["Apub"], eve: ["Apub"] },
        bubbles: { a: { text: "A秘密鍵で暗号化" } },
      },
      {
        text: "暗号文が通信路を流れます。盗聴者がコピーしました。",
        packet: { label: "暗号文", kind: "cipher" },
        tapped: true,
        keys: { a: ["Apub", "Apriv"], b: ["Apub"], eve: ["Apub"] },
      },
      {
        text: "Bさんは、Aさんの公開鍵で復号できました。ところが、Aさんの公開鍵はだれでも手に入れられるので、盗聴者も同じように復号できてしまいます。",
        packet: { label: "暗号文", kind: "cipher" },
        tapped: true,
        keys: { a: ["Apub", "Apriv"], b: ["Apub"], eve: ["Apub"] },
        bubbles: { b: { text: "A公開鍵で復号できた" }, eve: { text: "A公開鍵で復号できた！", alert: true } },
      },
    ],
  },
};
