"use client";
import { type DragEvent, type MouseEvent, type ReactNode, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CIPHER_TEXT, KEYS, PLAIN_TEXT, PRIV_COLOR, PUB_COLOR, canDecrypt, type KeyId } from "@/lib/keys";
import { CIPHER_COLOR, COMPARE_ITEMS, EVE_COLOR, PLAIN_COLOR, type CompareBin } from "@/lib/model";
import { useDoneWhen, useWheelStep } from "./hooks";
import PeekStage from "./PeekStage";
import { Feedback } from "./Quizzes";

// ---------- 共通部品：ドラッグでもタップでも置けるカード ----------

function dragCard(id: string, picked: string | null, setPicked: (v: string | null) => void) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData("text/plain", id);
      setPicked(id);
    },
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      setPicked(picked === id ? null : id);
    },
  };
}

function dropTarget(onPut: (id: string) => void, picked: string | null) {
  return {
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      onPut(e.dataTransfer.getData("text/plain"));
    },
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      if (picked) onPut(picked);
    },
  };
}

/** 鍵の札（ドラッグできる） */
function KeyCard({ id, picked, setPicked, disabled }: { id: KeyId; picked: string | null; setPicked: (v: string | null) => void; disabled?: boolean }) {
  const k = KEYS[id];
  const on = picked === id;
  return (
    <Box
      {...(disabled ? {} : dragCard(id, picked, setPicked))}
      role="button"
      aria-pressed={on}
      data-key={id}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.25,
        py: 0.5,
        borderRadius: 5,
        fontWeight: 700,
        fontSize: "0.9rem",
        cursor: disabled ? "default" : "grab",
        userSelect: "none",
        border: `2.5px solid ${k.color}`,
        bgcolor: on ? k.color : "#fff",
        color: on ? "#fff" : k.color,
        opacity: disabled ? 0.4 : 1,
        boxShadow: disabled ? 0 : 2,
      }}
    >
      <span>{k.icon}</span>
      {k.label}
    </Box>
  );
}

/** メッセージ（平文または暗号文）。鍵を落とす場所 */
function MessageCard({ locked, shake, picked, onPut, title }: { locked: KeyId | null; shake: number; picked: string | null; onPut: (id: string) => void; title?: string }) {
  return (
    <Box
      key={shake}
      className={shake ? "shake" : undefined}
      data-message
      {...dropTarget(onPut, picked)}
      sx={{
        mx: "auto",
        width: "100%",
        maxWidth: 320,
        p: 1.5,
        borderRadius: 3,
        textAlign: "center",
        border: `3px ${picked ? "dashed" : "solid"} ${locked ? CIPHER_COLOR : PLAIN_COLOR}`,
        bgcolor: picked ? "#e3f2fd" : locked ? "#f3e5f5" : "#fafafa",
        cursor: picked ? "pointer" : "default",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {title ?? "メッセージ（ここに鍵をドラッグ）"}
      </Typography>
      <Typography sx={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "monospace", color: locked ? CIPHER_COLOR : PLAIN_COLOR, letterSpacing: "0.1em" }}>
        {locked ? `🔒 ${CIPHER_TEXT}` : `📄 ${PLAIN_TEXT}`}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ color: locked ? CIPHER_COLOR : PLAIN_COLOR }}>
        {locked ? `暗号文（${KEYS[locked].label}で暗号化）` : "平文"}
      </Typography>
    </Box>
  );
}

// ---------- 第1章：鍵のペアを作って分ける ----------

type Place = "public" | "safe";

export function KeyPairStage({ onDone }: { onDone?: () => void }) {
  const [made, setMade] = useState(false);
  const [placed, setPlaced] = useState<Partial<Record<KeyId, Place>>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [miss, setMiss] = useState<{ id: KeyId; n: number } | null>(null);
  const done = placed.Bpub === "public" && placed.Bpriv === "safe";
  useDoneWhen(done, onDone);

  const put = (place: Place, id: string) => {
    if (id !== "Bpub" && id !== "Bpriv") return;
    setPicked(null);
    if ((id === "Bpub" && place === "public") || (id === "Bpriv" && place === "safe")) {
      setPlaced({ ...placed, [id]: place });
      setMiss(null);
    } else setMiss({ id, n: (miss?.n ?? 0) + 1 });
  };

  const box = (place: Place, title: string, sub: string, color: string, bg: string) => (
    <Box
      data-place={place}
      {...dropTarget((id) => put(place, id), picked)}
      sx={{ border: `2px ${picked ? "dashed" : "solid"} ${color}`, bgcolor: bg, borderRadius: 3, p: 1.5, minHeight: 110, cursor: picked ? "pointer" : "default" }}
    >
      <Typography fontWeight={700} sx={{ color }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        {sub}
      </Typography>
      {(Object.entries(placed) as [KeyId, Place][])
        .filter(([, p]) => p === place)
        .map(([id]) => (
          <KeyCard key={id} id={id} picked={null} setPicked={() => {}} />
        ))}
    </Box>
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
        <Box
          role="button"
          tabIndex={0}
          data-machine
          onClick={() => setMade(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setMade(true);
            }
          }}
          title="クリック（タップ）で鍵を作る"
          sx={{
            width: 150,
            p: 1.5,
            borderRadius: 3,
            textAlign: "center",
            border: "3px solid #546e7a",
            bgcolor: made ? "#eceff1" : "#fff8e1",
            cursor: made ? "default" : "pointer",
            userSelect: "none",
            boxShadow: made ? 0 : 3,
          }}
        >
          <Typography sx={{ fontSize: "2.2rem", lineHeight: 1.2 }}>🏭</Typography>
          <Typography fontWeight={700} sx={{ fontSize: "0.9rem" }}>
            鍵を作る機械
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {made ? "Bさんの鍵ペアができた" : "タップ！"}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: "1.6rem", color: "#90a4ae" }}>➜</Typography>
        <Stack spacing={1} sx={{ minWidth: 170 }} className="seq-anim">
          {made ? (
            (["Bpub", "Bpriv"] as KeyId[]).map((id) =>
              placed[id] ? (
                <Typography key={id} variant="caption" color="text.secondary">
                  {KEYS[id].label}：置いた ✓
                </Typography>
              ) : (
                <Box key={miss?.id === id ? `${id}-${miss.n}` : id} className={miss?.id === id ? "shake" : "pop"}>
                  <KeyCard id={id} picked={picked} setPicked={setPicked} />
                </Box>
              ),
            )
          ) : (
            <Typography variant="body2" color="text.secondary">
              （まだ鍵がありません）
            </Typography>
          )}
        </Stack>
      </Stack>
      {made && (
        <Typography variant="body2" fontWeight={700} textAlign="center">
          🔑 公開鍵と 🗝️ 秘密鍵は、1対（ペア）として同時に作られます
        </Typography>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        {box("public", "🌐 インターネットで公開", "だれでも手に入れられる場所", PUB_COLOR, "#e3f2fd")}
        {box("safe", "🔐 Bさんの金庫", "Bさんしか開けられない場所", PRIV_COLOR, "#e8f5e9")}
      </Box>
      {miss &&
        !done &&
        (miss.id === "Bpriv" ? (
          <Feedback ok={false}>秘密鍵を公開すると、だれでも復号できてしまいます。秘密鍵は、作った人がだれにももらさずに持っておく鍵です。</Feedback>
        ) : (
          <Feedback ok={false}>公開鍵は、しまっておかなくても大丈夫です。だれが手に入れてもよい鍵なので、公開しましょう。</Feedback>
        ))}
    </Stack>
  );
}

// ---------- 鍵をメッセージにドラッグして試す ----------

const PICK_KEYS: KeyId[] = ["Apub", "Bpriv", "Apriv", "Bpub"];
const PICK_NG: Partial<Record<KeyId, string>> = {
  Apub: "Aさんの公開鍵で暗号化すると、復号には Aさんの秘密鍵が必要です。それを持っているのは Aさんだけなので、Bさんは復号できません。",
  Apriv: "Aさんの秘密鍵で暗号化すると、Aさんの公開鍵で復号できます。公開鍵はだれでも手に入れられるので、だれでも読めてしまいます。",
  Bpriv: "Bさんの秘密鍵は、Bさんだけが持っている鍵です。Aさんは持っていないので使えません。",
};

export function KeyLab({ mode, onDone }: { mode: "lab" | "pick"; onDone?: () => void }) {
  const [locked, setLocked] = useState<KeyId | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [log, setLog] = useState<{ text: string; ok: boolean }[]>([]);
  const [failed, setFailed] = useState(false);
  const [opened, setOpened] = useState(false);
  const [ng, setNg] = useState<KeyId | null>(null);
  const keys: KeyId[] = mode === "lab" ? ["Bpub", "Bpriv"] : PICK_KEYS;
  const done = mode === "lab" ? failed && opened : locked === "Bpub";
  useDoneWhen(done, onDone);

  const put = (id: string) => {
    if (!(id in KEYS)) return;
    const k = id as KeyId;
    setPicked(null);
    if (mode === "pick") {
      if (locked) return;
      if (k === "Bpub") {
        setLocked(k);
        setNg(null);
      } else {
        setNg(k);
        setShake(shake + 1);
      }
      return;
    }
    if (!locked) {
      setLocked(k);
      setLog([...log, { text: `🔒 ${KEYS[k].label}で暗号化した`, ok: true }]);
    } else if (canDecrypt(locked, k)) {
      setLocked(null);
      setOpened(true);
      setLog([...log, { text: `🔓 ${KEYS[k].label}で復号できた（${KEYS[locked].label}と対になる鍵）`, ok: true }]);
    } else {
      setFailed(true);
      setShake(shake + 1);
      setLog([...log, { text: `❌ ${KEYS[k].label}では復号できない（暗号化に使ったのと同じ鍵）`, ok: false }]);
    }
  };

  return (
    <Stack spacing={2}>
      {mode === "pick" && (
        <Typography fontWeight={700} textAlign="center" sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}>
          👩 Aさん（送信者）✉️ ➜ 🧑 Bさん（受信者）
        </Typography>
      )}
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        {keys.map((id) => (
          <KeyCard key={id} id={id} picked={picked} setPicked={setPicked} disabled={mode === "pick" && locked !== null} />
        ))}
      </Stack>
      <MessageCard locked={locked} shake={shake} picked={picked} onPut={put} />
      {mode === "lab" && (
        <Stack spacing={0.5}>
          {log.length === 0 && (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              まず、どちらかの鍵をメッセージにドラッグして暗号化しよう。次に、暗号文に鍵をドラッグして復号を試そう。
            </Typography>
          )}
          {log.map((l, i) => (
            <Typography key={i} variant="body2" fontWeight={700} sx={{ color: l.ok ? "text.primary" : EVE_COLOR }}>
              {l.text}
            </Typography>
          ))}
          {done && <Feedback ok>確かめられました！ 片方の鍵で暗号化したものは、対になるもう一方の鍵でしか復号できません。</Feedback>}
          {locked === null && log.length > 0 && !done && (
            <Typography variant="body2" color="text.secondary">
              もう一度暗号化して、別の鍵でも試してみよう。
            </Typography>
          )}
        </Stack>
      )}
      {mode === "pick" &&
        (locked ? (
          <Feedback ok>正解！ 受信者である Bさんの公開鍵で暗号化します。復号できるのは、対になる秘密鍵を持っている Bさんだけです。</Feedback>
        ) : (
          ng && <Feedback ok={false}>{PICK_NG[ng]}</Feedback>
        ))}
    </Stack>
  );
}

// ---------- 第1章：公開鍵から秘密鍵を当ててみる ----------

const GUESS_GOAL = 10;
const PUBLIC_VALUE = "8C3F 51A9 E27B 04D6 9F1C 7A38";

function randomKey() {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0"),
  ).join(" ");
}

export function GuessStage({ onDone }: { onDone?: () => void }) {
  const [tries, setTries] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const tryOne = () => setTries((t) => [randomKey(), ...t].slice(0, 50));
  const count = tries.length;
  useWheelStep(box, tryOne);
  useDoneWhen(count >= GUESS_GOAL, onDone);
  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 1.25, borderColor: PUB_COLOR, borderWidth: 2 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: PUB_COLOR }}>
          🔑 Bさんの公開鍵（だれでも見られる）
        </Typography>
        <Typography sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.05rem" }}>{PUBLIC_VALUE}</Typography>
      </Paper>
      <Box
        ref={box}
        data-guess
        title="ホイールを回すと、次の候補を試します"
        sx={{ border: `2px dashed ${EVE_COLOR}`, borderRadius: 2, p: 1.25, bgcolor: "#fff8f8", cursor: "ns-resize", userSelect: "none" }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="body2" fontWeight={700} sx={{ color: EVE_COLOR }}>
            🕵️ 秘密鍵の候補（ホイールで次々に試す）
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            試した回数：{count}
          </Typography>
        </Stack>
        <Stack spacing={0.25} sx={{ height: 150, overflow: "hidden" }}>
          {tries.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              ここでマウスホイールを回すと、秘密鍵の候補を1つずつ試します。
            </Typography>
          )}
          {tries.slice(0, 6).map((t, i) => (
            <Stack key={`${count - i}`} direction="row" spacing={1} alignItems="center" sx={{ opacity: 1 - i * 0.13 }}>
              <Typography sx={{ fontFamily: "monospace", fontWeight: 700, color: PRIV_COLOR }}>🗝️ {t}</Typography>
              <Typography fontWeight={700} sx={{ color: EVE_COLOR }}>
                ✕ ちがう
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Box>
        <Button variant="outlined" onClick={tryOne}>
          次の候補を試す
        </Button>
      </Box>
      {count >= GUESS_GOAL && (
        <Feedback ok>
          {count} 回試しても当たりません。秘密鍵の候補は数えきれないほどあり、公開鍵から秘密鍵を探し当てることは困難です。だから、公開鍵は公開しても大丈夫なのです。
        </Feedback>
      )}
    </Stack>
  );
}

// ---------- 第2章：盗聴者になって、公開鍵で復号を試す ----------

const EVE_ITEMS = [
  { label: "🔑 B公開鍵", color: PUB_COLOR },
  { label: `🔒 ${CIPHER_TEXT}`, color: CIPHER_COLOR },
];

export function EveStage({ onDone }: { onDone?: () => void }) {
  const [collected, setCollected] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [tried, setTried] = useState(false);
  useDoneWhen(tried, onDone);

  const put = (id: string) => {
    if (id !== "Bpub") return;
    setPicked(null);
    setShake(shake + 1);
    setTried(true);
  };

  return (
    <Stack spacing={2}>
      <PeekStage items={EVE_ITEMS} summary="Bさんの公開鍵と暗号文を手に入れた！ 下で復号を試してみよう。" onDone={() => setCollected(true)} />
      {collected && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" fontWeight={700} sx={{ color: EVE_COLOR }}>
              🕵️ 盗聴者が持っている鍵：
            </Typography>
            <KeyCard id="Bpub" picked={picked} setPicked={setPicked} />
            <Box sx={{ px: 1.25, py: 0.5, borderRadius: 5, border: "2px dashed #b0bec5", color: "#90a4ae", fontWeight: 700, fontSize: "0.85rem" }}>
              🗝️ Bさんの秘密鍵（Bさんだけが持っている）
            </Box>
          </Stack>
          <MessageCard locked="Bpub" shake={shake} picked={picked} onPut={put} title="コピーした暗号文（ここに鍵をドラッグ）" />
          {tried && (
            <Feedback ok>
              Bさんの公開鍵では復号できません！ 復号に必要な Bさんの秘密鍵は、Bさんの手元から一度も通信路を流れていないので、盗聴者は手に入れられません。
            </Feedback>
          )}
        </Stack>
      )}
    </Stack>
  );
}

// ---------- 第4章：共通鍵暗号方式と公開鍵暗号方式に仕分ける ----------

export function CompareStage({ onDone }: { onDone?: () => void }) {
  const [box, setBox] = useState<Record<string, CompareBin | undefined>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [miss, setMiss] = useState<{ label: string; n: number } | null>(null);
  const placed = COMPARE_ITEMS.filter((i) => box[i.label]).length;
  const done = placed === COMPARE_ITEMS.length;
  useDoneWhen(done, onDone);

  const put = (bin: CompareBin, label: string) => {
    const item = COMPARE_ITEMS.find((i) => i.label === label);
    if (!item || box[label]) return;
    setPicked(null);
    if (item.answer === bin) {
      setBox({ ...box, [label]: bin });
      setMiss(null);
    } else setMiss({ label, n: (miss?.n ?? 0) + 1 });
  };

  const bins: { bin: CompareBin; title: ReactNode; color: string; bg: string }[] = [
    { bin: "sym", title: "🔑 共通鍵暗号方式", color: "#ef6c00", bg: "#fff3e0" },
    { bin: "pub", title: "🔑🗝️ 公開鍵暗号方式", color: PUB_COLOR, bg: "#e3f2fd" },
  ];

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="center" sx={{ minHeight: 40 }}>
        {COMPARE_ITEMS.filter((i) => !box[i.label]).map((i) => (
          <Box
            key={miss?.label === i.label ? `${i.label}-${miss.n}` : i.label}
            className={miss?.label === i.label ? "shake" : undefined}
            {...dragCard(i.label, picked, setPicked)}
            role="button"
            aria-pressed={picked === i.label}
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "grab",
              userSelect: "none",
              border: `2px solid ${miss?.label === i.label ? EVE_COLOR : "#455a64"}`,
              bgcolor: picked === i.label ? "#455a64" : "#fff",
              color: picked === i.label ? "#fff" : "#455a64",
              boxShadow: 2,
            }}
          >
            {i.label}
          </Box>
        ))}
        {done && <Typography fontWeight={700}>全部仕分けられました！</Typography>}
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        {bins.map((b) => (
          <Box
            key={b.bin}
            data-bin={b.bin}
            {...dropTarget((label) => put(b.bin, label), picked)}
            sx={{ border: `2px ${picked ? "dashed" : "solid"} ${b.color}`, bgcolor: b.bg, borderRadius: 3, p: 1.5, minHeight: 170, cursor: picked ? "pointer" : "default" }}
          >
            <Typography fontWeight={700} sx={{ color: b.color, fontSize: "1.05rem", mb: 0.75 }}>
              {b.title}
            </Typography>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
              {COMPARE_ITEMS.filter((i) => box[i.label] === b.bin).map((i) => (
                <Typography key={i.label} component="li" variant="body2" fontWeight={600}>
                  {i.label}
                </Typography>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
      {miss && !done && <Feedback ok={false}>「{miss.label}」は、そちらではありません。ここまでの体験を思い出してみよう。</Feedback>}
    </Stack>
  );
}
