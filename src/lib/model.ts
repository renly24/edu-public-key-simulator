// ---------- モデル（スライドの内容） ----------

import type { SceneId } from "./transfer";

export const PLAIN_COLOR = "#37474f";
export const CIPHER_COLOR = "#6a1b9a";
export const EVE_COLOR = "#c62828";

export const CHAPTERS = [
  { id: 1, name: "公開鍵暗号方式とは", color: "#455a64" },
  { id: 2, name: "公開鍵暗号方式のしくみ", color: "#1565c0" },
  { id: 3, name: "どの鍵を使う？", color: CIPHER_COLOR },
  { id: 4, name: "共通鍵暗号方式との違い", color: "#2e7d32" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

// ---------- 問題 ----------

export interface ChoiceQuiz {
  kind: "choice";
  question: string;
  options: string[];
  answer: number;
  ok: string;
  ng: string;
  /** true の予想問題は、答えるまで次のスライドへ進めない */
  gate?: boolean;
}

export type Quiz = ChoiceQuiz | { kind: "task" } | { kind: "test" };

export type QuizLabel = "予想問題" | "体験問題" | "確認問題";

export function quizLabel(quiz: Quiz | undefined): QuizLabel | null {
  if (!quiz) return null;
  if (quiz.kind === "choice") return quiz.gate ? "予想問題" : "確認問題";
  if (quiz.kind === "test") return "確認問題";
  return "体験問題";
}

export const QUIZ_COLOR: Record<QuizLabel, string> = {
  予想問題: "#1565c0",
  体験問題: "#ef6c00",
  確認問題: "#2e7d32",
};

// ---------- スライド ----------

export type Stage =
  /** Aさん ⇄ Bさんの送受信。札をドラッグして送る */
  | { kind: "transfer"; scene: SceneId }
  /** 鍵のペアを作って、公開する鍵としまっておく鍵に分ける */
  | { kind: "keypair" }
  /** 鍵をメッセージにドラッグして、暗号化・復号を試す */
  | { kind: "keylab"; mode: "lab" | "pick" }
  /** 公開鍵から秘密鍵を当てようとしてみる */
  | { kind: "guess" }
  /** 盗聴者になって、のぞき見た公開鍵で復号を試す */
  | { kind: "eve" }
  /** 手順を並べる */
  | { kind: "order" }
  /** 共通鍵暗号方式と公開鍵暗号方式に仕分ける */
  | { kind: "compare" }
  | { kind: "test" };

export interface Slide {
  id?: string;
  chapter: ChapterId;
  title: string;
  description: string;
  stage: Stage;
  /** 説明の下に出す要点 */
  points?: string[];
  quiz?: Quiz;
  /** やってみよう（操作の課題）。クリアするまで次のスライドへ進めない */
  mission?: string;
}

export const SLIDES: Slide[] = [
  // ---- 第1章 公開鍵暗号方式とは ----
  {
    id: "recap",
    chapter: 1,
    title: "共通鍵暗号方式の課題",
    description:
      "共通鍵暗号方式では、送信者と受信者が同じ共通鍵を持つ必要がありました。共通鍵を相手に渡すとき、通信路で盗まれると、暗号文を復号されてしまいます。もう一度確かめてみよう。",
    stage: { kind: "transfer", scene: "symleak" },
    mission: "共通鍵の札と暗号文の札を、順に Bさんまでドラッグして送ろう",
  },
  {
    chapter: 1,
    title: "鍵を盗まれないようにするには？",
    description: "共通鍵暗号方式では、暗号化に使う鍵と復号に使う鍵が同じなので、鍵を相手に渡さなければなりませんでした。",
    stage: { kind: "transfer", scene: "symleak" },
    quiz: {
      kind: "choice",
      gate: true,
      question: "復号に使う鍵を、通信路で盗まれないようにするには、どうすればよいと思う？",
      options: [
        "鍵をもっと短くして送る",
        "暗号化に使う鍵と復号に使う鍵を別々にして、復号に使う鍵は受信者だけが持つ",
        "鍵を2回に分けて送る",
      ],
      answer: 1,
      ok: "正解！ 暗号化用と復号用で別の鍵を使えば、復号用の鍵はだれにも渡さずにすみます。これが公開鍵暗号方式の考え方です。",
      ng: "短くしても分けても、通信路を流れれば盗まれるおそれがあります。暗号化用と復号用で別の鍵を使い、復号用の鍵はだれにも渡さないのが、公開鍵暗号方式の考え方です。",
    },
  },
  {
    id: "keypair",
    chapter: 1,
    title: "秘密鍵と公開鍵",
    description:
      "公開鍵暗号方式では、対になる2つの鍵（秘密鍵と公開鍵）を作ります。秘密鍵は、作った人が自分で持ち、だれにももらさないように保管します。公開鍵は、だれが手に入れてもよい鍵で、インターネットで公開してもかまいません。",
    stage: { kind: "keypair" },
    quiz: { kind: "task" },
    mission: "鍵を作る機械をタップして鍵のペアを作り、公開鍵と秘密鍵をそれぞれ正しい場所へドラッグしよう",
    points: ["秘密鍵：作った人だけが持つ。絶対にもらさない", "公開鍵：だれが手に入れてもよい。公開してもよい"],
  },
  {
    id: "pair",
    chapter: 1,
    title: "対になる鍵の性質",
    description:
      "秘密鍵と公開鍵は、1つのペアとして作られます。片方の鍵で暗号化したものは、対になるもう一方の鍵でしか復号できません。鍵の札をメッセージにドラッグして確かめよう。",
    stage: { kind: "keylab", mode: "lab" },
    mission: "Bさんの鍵でメッセージを暗号化し、復号できない鍵とできる鍵の両方を試そう",
    points: ["秘密鍵と公開鍵は、1対の鍵として作られる", "片方の鍵で暗号化したものは、対になるもう一方の鍵でしか復号できない"],
  },
  {
    id: "guess",
    chapter: 1,
    title: "公開鍵から秘密鍵はわかる？",
    description:
      "公開鍵はだれでも手に入れられます。では、公開鍵をもとに秘密鍵を探し当てることはできるでしょうか。盗聴者になって、秘密鍵を当ててみよう。",
    stage: { kind: "guess" },
    mission: "鍵の候補の上でマウスホイールを回して（またはボタンで）、秘密鍵を 10 回当ててみよう",
    points: ["公開鍵から秘密鍵を探し当てることは困難"],
  },

  // ---- 第2章 公開鍵暗号方式のしくみ ----
  {
    id: "flow",
    chapter: 2,
    title: "公開鍵暗号方式で送ってみよう",
    description:
      "Aさん（送信者）が Bさん（受信者）に暗号化したメッセージを送ります。送信者は受信者の公開鍵で暗号化し、受信者は自分の秘密鍵で復号します。今度は、公開鍵が Bさんから Aさんへ流れることに注目しよう。",
    stage: { kind: "transfer", scene: "public" },
    mission: "Bさんの公開鍵の札を Aさんへ、暗号文の札を Bさんへドラッグして送り、最後の場面まで進めよう",
    points: ["送信者は、受信者の公開鍵で暗号化する", "受信者は、自分の秘密鍵で復号する"],
  },
  {
    id: "eve",
    chapter: 2,
    title: "盗聴者になってみよう",
    description:
      "盗聴者は、通信路を流れた Bさんの公開鍵と暗号文をコピーできます。まず虫めがねで通信路をのぞいて手に入れ、次に、その公開鍵で暗号文を復号できるか試してみよう。",
    stage: { kind: "eve" },
    mission: "カーソル（指）を通信路の上で動かして公開鍵と暗号文を手に入れ、公開鍵を暗号文にドラッグして復号を試そう",
    points: ["秘密鍵は受信者だけが持っているので、盗聴者は復号できない"],
  },
  {
    id: "order",
    chapter: 2,
    title: "手順を並べよう",
    description: "公開鍵暗号方式で、Aさんが Bさんに暗号化したメッセージを送る手順を、正しい順番にタップしてください。",
    stage: { kind: "order" },
    quiz: { kind: "task" },
    mission: "5つの手順を、正しい順番に全部並べよう",
  },

  // ---- 第3章 どの鍵を使う？ ----
  {
    id: "pick",
    chapter: 3,
    title: "暗号化に使う鍵はどれ？",
    description:
      "Aさんが Bさんあてに、インターネットで電子メールを送ります。公開鍵暗号方式でメッセージを暗号化するとき、Aさんはどの鍵を使えばよいでしょう。4つの鍵から選んで、メッセージにドラッグしてください。",
    stage: { kind: "keylab", mode: "pick" },
    quiz: { kind: "task" },
    mission: "正しい鍵をメッセージにドラッグして暗号化しよう",
  },
  {
    id: "selfpriv",
    chapter: 3,
    title: "自分の秘密鍵で暗号化したら？",
    description:
      "送信者の Aさんが、自分の秘密鍵で暗号化して送ったとします。受信者の Bさんは、Aさんの公開鍵で復号できます。札を送って、何が起きるか確かめよう。",
    stage: { kind: "transfer", scene: "selfpriv" },
    mission: "暗号文の札を Bさんまでドラッグして送り、最後の場面まで進めよう",
    quiz: {
      kind: "choice",
      question: "送信者が自分の秘密鍵で暗号化して送ると、どんな問題がある？",
      options: [
        "受信者が復号できない",
        "暗号文が送れない",
        "送信者の公開鍵はだれでも手に入れられるので、だれでも復号できてしまう",
      ],
      answer: 2,
      ok: "正解！ 送信者の公開鍵は公開されているので、盗聴者も復号できてしまいます。これでは内容を秘密にできません。",
      ng: "Bさんは Aさんの公開鍵で復号できました。でも、Aさんの公開鍵はだれでも手に入れられるので、盗聴者も復号できてしまいます。",
    },
  },

  // ---- 第4章 共通鍵暗号方式との違い ----
  {
    id: "compare",
    chapter: 4,
    title: "共通鍵暗号方式と比べよう",
    description:
      "公開鍵暗号方式では、秘密鍵を管理するのはデータを受け取る人だけなので、共通鍵暗号方式と比べて鍵が盗まれるリスクは低くなります。ただし、暗号化のアルゴリズムが違うので、共通鍵暗号方式よりも処理は遅くなります。代表的なものに RSA 暗号があります。",
    stage: { kind: "compare" },
    quiz: { kind: "task" },
    mission: "特徴のカードを「共通鍵暗号方式」「公開鍵暗号方式」の箱へドラッグして仕分けよう",
    points: ["RSA 暗号の名前は、発明した3人の研究者（Rivest・Shamir・Adleman）の頭文字から"],
  },
  {
    chapter: 4,
    title: "まとめテスト",
    description:
      "ここまでの内容から8問です。全部答えたら「採点する」を押してください。間違えた問題は、説明のスライドに戻って確認できます。最後の結果画面をスクリーンショットして提出しましょう。",
    stage: { kind: "test" },
    quiz: { kind: "test" },
  },
];

export function slideIndexOf(id: string) {
  return SLIDES.findIndex((s) => s.id === id);
}

// ---------- 手順の並べ替え ----------

export const ORDER_STEPS = [
  "受信者の Bさんが、公開鍵と秘密鍵のペアを作る",
  "送信者の Aさんが、Bさんの公開鍵を手に入れる",
  "Aさんが、Bさんの公開鍵で平文を暗号化する",
  "ネットワーク上を、暗号文の状態で送る",
  "Bさんが、自分の秘密鍵で復号して平文を得る",
];
/** 選択肢を並べる順番（正しい順番とは変えておく） */
export const ORDER_SHOWN = [3, 0, 4, 2, 1];
export const ORDER_HINT = [
  "最初に準備をするのは、受信者です。鍵のペアがないと始まりません。",
  "暗号化するには、送信者が受信者の鍵を手に入れる必要があります。",
  "鍵を手に入れたら、送る前に平文を暗号文に変えます。",
  "暗号化したら、暗号文を送ります。",
  "最後に、受け取った Bさんが元に戻します。",
];
export const ORDER_DONE =
  "正解！ 受信者が鍵のペアを作り、公開鍵だけを送信者に渡します。秘密鍵は受信者の手元から一度も出ないので、通信路で盗まれる心配がありません。";

// ---------- 仕分け（共通鍵暗号方式・公開鍵暗号方式） ----------

export type CompareBin = "sym" | "pub";

export const COMPARE_ITEMS: { label: string; answer: CompareBin }[] = [
  { label: "暗号化と復号に同じ鍵を使う", answer: "sym" },
  { label: "対になる2つの鍵（公開鍵と秘密鍵）を使う", answer: "pub" },
  { label: "鍵を相手に安全に渡す方法が問題になる", answer: "sym" },
  { label: "復号に使う鍵は、受信者だけが持つ", answer: "pub" },
  { label: "処理が速い", answer: "sym" },
  { label: "処理が遅い", answer: "pub" },
  { label: "代表例：AES", answer: "sym" },
  { label: "代表例：RSA 暗号", answer: "pub" },
];

// ---------- まとめテスト ----------

export const TEST_QUESTIONS: { question: string; options: string[]; answer: number; review: string }[] = [
  {
    question: "公開鍵暗号方式で、鍵を作った人だけが持ち、だれにももらさない鍵は？",
    options: ["公開鍵", "共通鍵", "秘密鍵"],
    answer: 2,
    review: "keypair",
  },
  {
    question: "公開鍵の説明として正しいものは？",
    options: ["だれが手に入れてもよい", "作った人だけが持つ", "送信者と受信者の2人だけで共有する"],
    answer: 0,
    review: "keypair",
  },
  {
    question: "Bさんの公開鍵で暗号化したものを復号できる鍵は？",
    options: ["Bさんの公開鍵", "Bさんの秘密鍵", "Aさんの秘密鍵"],
    answer: 1,
    review: "pair",
  },
  {
    question: "Aさんが Bさんに暗号化したメッセージを送るとき、暗号化に使う鍵は？",
    options: ["Aさんの秘密鍵", "Bさんの公開鍵", "Bさんの秘密鍵"],
    answer: 1,
    review: "pick",
  },
  {
    question: "共通鍵暗号方式と比べたときの、公開鍵暗号方式の長所は？",
    options: ["鍵が盗まれるリスクが低い", "処理が速い", "鍵が1つですむ"],
    answer: 0,
    review: "compare",
  },
  {
    question: "共通鍵暗号方式と比べたときの、公開鍵暗号方式の短所は？",
    options: ["鍵を相手に渡す必要がある", "処理が遅い", "公開鍵から秘密鍵がすぐわかる"],
    answer: 1,
    review: "compare",
  },
  {
    question: "公開鍵暗号方式の代表的な暗号は？",
    options: ["AES", "RSA 暗号", "HTTP"],
    answer: 1,
    review: "compare",
  },
  {
    question: "公開鍵から秘密鍵を探し当てることは？",
    options: ["簡単にできる", "公開鍵と同じなので必要ない", "困難である"],
    answer: 2,
    review: "guess",
  },
];
