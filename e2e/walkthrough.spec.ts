import { expect, test, type Page } from "@playwright/test";

/**
 * アプリの全スライドを最初から最後まで、実際の操作（ドラッグの代わりのタップ操作、
 * ホイール、虫めがねのホバー/タッチ）で進め、最後のテストまで到達できることを確認する。
 *
 * デスクトップ（マウス）とタブレット（タッチ）の両方の projects で実行することで、
 * 「マウスでは動くがタッチでは反応しない」種類の不具合（ダブルクリック専用の操作、
 * 虫めがねの中身が指で隠れる、など）を自動で検知する。
 */

const CONSOLE_IGNORE = [/Next\.js now collects/i, /Download the React DevTools/i];

function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (CONSOLE_IGNORE.some((re) => re.test(text))) return;
    errors.push(`console.error: ${text}`);
  });
  return errors;
}

/** 下部の「次へ」を押して次のスライドに進む */
async function goNext(page: Page) {
  const next = page.getByRole("button", { name: "次へ" });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
}

/** 送受信の図（TransferStage）を、ドラッグせずに最後の場面まで進める */
async function finishTransfer(page: Page) {
  for (let i = 0; i < 20; i++) {
    const restart = page.getByRole("button", { name: "最初から" });
    if (await restart.isVisible().catch(() => false)) return; // 最後の場面まで到達
    const auto = page.getByRole("button", { name: "自動で送る" });
    const single = page.getByRole("button", { name: "1つ進める" });
    if (await auto.isVisible().catch(() => false)) {
      await auto.click();
    } else if (await single.isVisible().catch(() => false)) {
      await single.click();
    } else {
      break;
    }
    await page.waitForTimeout(150);
  }
}

/** 鍵カードをタップで選んでから、置き場所をタップして置く（ドラッグの代わり） */
async function tapToPlace(page: Page, card: ReturnType<Page["locator"]>, target: ReturnType<Page["locator"]>) {
  await card.click();
  await target.click();
}

async function doKeyPairMission(page: Page) {
  await page.locator("[data-machine]").click();
  await expect(page.getByText("Bさんの鍵ペアができた")).toBeVisible();
  await tapToPlace(page, page.locator('[data-key="Bpub"]'), page.locator('[data-place="public"]'));
  await tapToPlace(page, page.locator('[data-key="Bpriv"]'), page.locator('[data-place="safe"]'));
}

async function doKeyLabMission(page: Page) {
  // Bpub で暗号化 → 同じ Bpub では復号できない → Bpriv でなら復号できる
  await tapToPlace(page, page.locator('[data-key="Bpub"]'), page.locator("[data-message]"));
  await tapToPlace(page, page.locator('[data-key="Bpub"]'), page.locator("[data-message]"));
  await tapToPlace(page, page.locator('[data-key="Bpriv"]'), page.locator("[data-message]"));
}

async function doGuessMission(page: Page) {
  const tryBtn = page.getByRole("button", { name: "次の候補を試す" });
  for (let i = 0; i < 10; i++) await tryBtn.click();
}

/** 虫めがねで、通信路を流れるメッセージを全部のぞき見る */
async function doEveMission(page: Page) {
  const svg = page.locator('svg[role="img"]').first();
  const box = await svg.boundingBox();
  if (!box) throw new Error("PeekStage の svg が見つからない");
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * (130 / 240); // LINE_Y 付近
  // マウスは hover、タッチは押し続けることで「のぞく」状態を作る。
  // CDP（newCDPSession）は Chromium 専用で WebKit では使えないため、
  // 素の PointerEvent をディスパッチして、エンジンを問わず動くようにする。
  if (test.info().project.use.hasTouch) {
    const dispatchTouchPointer = (type: "pointerdown" | "pointerup", px: number, py: number) =>
      svg.evaluate(
        (el, [t, ex, ey]) => {
          el.dispatchEvent(
            new PointerEvent(t as string, { bubbles: true, cancelable: true, pointerType: "touch", pointerId: 1, isPrimary: true, clientX: ex as number, clientY: ey as number }),
          );
        },
        [type, px, py] as const,
      );
    await dispatchTouchPointer("pointerdown", x, y);
    await expect(page.getByText(/のぞき見たもの（2 \/ 2）/)).toBeVisible({ timeout: 10_000 });
    await dispatchTouchPointer("pointerup", x, y);
  } else {
    await page.mouse.move(x, y);
    await expect(page.getByText(/のぞき見たもの（2 \/ 2）/)).toBeVisible({ timeout: 10_000 });
  }
  await tapToPlace(page, page.locator('[data-key="Bpub"]'), page.locator("[data-message]"));
}

async function doOrderMission(page: Page) {
  const ORDER_STEPS = [
    "受信者の Bさんが、公開鍵と秘密鍵のペアを作る",
    "送信者の Aさんが、Bさんの公開鍵を手に入れる",
    "Aさんが、Bさんの公開鍵で平文を暗号化する",
    "ネットワーク上を、暗号文の状態で送る",
    "Bさんが、自分の秘密鍵で復号して平文を得る",
  ];
  for (const step of ORDER_STEPS) {
    await page.getByRole("button", { name: step }).click();
  }
}

async function doKeyPickMission(page: Page) {
  await tapToPlace(page, page.locator('[data-key="Bpub"]'), page.locator("[data-message]"));
}

async function doCompareMission(page: Page) {
  const COMPARE_ITEMS: { label: string; bin: "sym" | "pub" }[] = [
    { label: "暗号化と復号に同じ鍵を使う", bin: "sym" },
    { label: "対になる2つの鍵（公開鍵と秘密鍵）を使う", bin: "pub" },
    { label: "鍵を相手に安全に渡す方法が問題になる", bin: "sym" },
    { label: "復号に使う鍵は、受信者だけが持つ", bin: "pub" },
    { label: "処理が速い", bin: "sym" },
    { label: "処理が遅い", bin: "pub" },
    { label: "代表例：AES", bin: "sym" },
    { label: "代表例：RSA 暗号", bin: "pub" },
  ];
  for (const item of COMPARE_ITEMS) {
    await tapToPlace(page, page.getByRole("button", { name: item.label, exact: true }), page.locator(`[data-bin="${item.bin}"]`));
  }
}

const TEST_QUESTIONS_ANSWERS = [
  "秘密鍵",
  "だれが手に入れてもよい",
  "Bさんの秘密鍵",
  "Bさんの公開鍵",
  "鍵が盗まれるリスクが低い",
  "処理が遅い",
  "RSA 暗号",
  "困難である",
];

async function finishFinalTest(page: Page) {
  for (let i = 0; i < TEST_QUESTIONS_ANSWERS.length; i++) {
    await page.locator(`[data-question="${i}"]`).getByRole("button", { name: TEST_QUESTIONS_ANSWERS[i], exact: true }).click();
  }
  await page.getByRole("button", { name: "採点する" }).click();
  await expect(page.getByText(`${TEST_QUESTIONS_ANSWERS.length} / ${TEST_QUESTIONS_ANSWERS.length}`)).toBeVisible();
}

test.describe("公開鍵暗号方式シミュレーター：一連の画面操作", () => {
  test("最初のスライドから最後のまとめテストまで、実際に操作して進められる", async ({ page }, testInfo) => {
    const errors = trackPageErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /公開鍵暗号方式のしくみ/ })).toBeVisible();

    // スライド 1：共通鍵の課題（transfer / ドラッグのミッション）
    await finishTransfer(page);
    await goNext(page);

    // スライド 2：予想問題（ゲート）
    await page.getByRole("button", { name: "暗号化に使う鍵と復号に使う鍵を別々にして、復号に使う鍵は受信者だけが持つ" }).click();
    await goNext(page);

    // スライド 3：鍵を作る機械（タップ） + 配置
    await doKeyPairMission(page);
    await goNext(page);

    // スライド 4：鍵と対になる性質（keylab lab）
    await doKeyLabMission(page);
    await goNext(page);

    // スライド 5：公開鍵から秘密鍵を当てる（ホイール or ボタン）
    await doGuessMission(page);
    await goNext(page);

    // スライド 6：公開鍵暗号方式で送る（transfer）
    await finishTransfer(page);
    await goNext(page);

    // スライド 7：盗聴者になる（虫めがね + 復号を試す）
    await doEveMission(page);
    await goNext(page);

    // スライド 8：手順を並べる
    await doOrderMission(page);
    await goNext(page);

    // スライド 9：暗号化に使う鍵はどれ？
    await doKeyPickMission(page);
    await goNext(page);

    // スライド 10：自分の秘密鍵で暗号化したら（transfer selfpriv）
    await finishTransfer(page);
    await goNext(page);

    // スライド 11：共通鍵暗号方式と比べよう（仕分け）
    await doCompareMission(page);
    await goNext(page);

    // スライド 12：まとめテスト
    await finishFinalTest(page);

    if (errors.length > 0) {
      testInfo.annotations.push({ type: "console-errors", description: errors.join("\n") });
    }
    expect(errors, `ページ上でエラーが発生した:\n${errors.join("\n")}`).toEqual([]);
  });
});
