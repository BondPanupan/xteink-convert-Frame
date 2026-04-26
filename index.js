const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
// const archiver = require("archiver");

const inputFolder = "./images/imperfection-02";
const outputFolder = "./output";
const epubFolder = "./epub";

const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 480;
// const SCROLL_STEP = 80;
const SCROLL_STEP = 420 // 160*2


// ─── STEP 1: สร้าง frames ───────────────────────────────────────────────────

async function generateFrames() {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const files = fs.readdirSync(inputFolder)
    .filter(f => /\.(jpg|jpeg|png|webp|HEIC)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.log(`ไม่พบไฟล์ภาพใน โฟลเดอร์ ${inputFolder}`);
    return false;
  }

  console.log(`พบ ${files.length} ไฟล์: ${files.join(", ")}`);
  const ext = path.extname(files[0]).toLowerCase();

  console.log("\nโหลดและ resize ภาพทั้งหมด...");
  const resizedBuffers = [];
  const metas = [];

  for (const file of files) {
    const buf = await sharp(path.join(inputFolder, file))
      .rotate()
      .resize({ width: FRAME_WIDTH })
      .grayscale()  // แปลงเป็น grayscale
      .normalise()  // ลบเงา: ปรับปกติ histogram
      .linear(1.8, 0)  // เพิ่ม contrast สำหรับ e-ink ขาวดำ
      .threshold()  // แปลงเป็นขาว-ดำเท่านั้น สำหรับ e-reader
      .png()
      .toBuffer();

    const meta = await sharp(buf).metadata();
    resizedBuffers.push(buf);
    metas.push(meta);
    console.log(`  ✓ ${file}: ${meta.width} x ${meta.height}`);
  }

  const totalHeight = metas.reduce((sum, m) => sum + m.height, 0);
  console.log(`\nต่อภาพแนวตั้ง: ${FRAME_WIDTH} x ${totalHeight}`);

  const compositeInputs = [];
  let currentTop = 0;
  for (let i = 0; i < resizedBuffers.length; i++) {
    compositeInputs.push({ input: resizedBuffers[i], top: currentTop, left: 0 });
    currentTop += metas[i].height;
  }

  const fullCanvas = await sharp({
    create: {
      width: FRAME_WIDTH,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();

  console.log("✓ ต่อภาพสำเร็จ");

  const scrollableHeight = totalHeight - FRAME_HEIGHT;
  let frameIndex = 1;

  console.log(`\nสร้าง frames (canvas: ${FRAME_WIDTH} x ${totalHeight}, scroll: ${scrollableHeight}px)...`);

  for (let scrollY = 0; scrollY <= scrollableHeight; scrollY += SCROLL_STEP) {
    const outPath = path.join(
      outputFolder,
      `frame_${String(frameIndex).padStart(3, "0")}${ext}`
    );

    await sharp(fullCanvas)
      .extract({ left: 0, top: scrollY, width: FRAME_WIDTH, height: FRAME_HEIGHT })
      .toFile(outPath);

    console.log(`  ✓ frame ${frameIndex} (scrollY: ${scrollY}px)`);
    frameIndex++;
  }

  // เพิ่ม frame สุดท้ายถ้า scrollY ไม่ลงตัวพอดี
  if (scrollableHeight % SCROLL_STEP !== 0) {
    const outPath = path.join(
      outputFolder,
      `frame_${String(frameIndex).padStart(3, "0")}${ext}`
    );

    await sharp(fullCanvas)
      .extract({ left: 0, top: scrollableHeight, width: FRAME_WIDTH, height: FRAME_HEIGHT })
      .toFile(outPath);

    console.log(`  ✓ frame ${frameIndex} (scrollY: ${scrollableHeight}px) ← frame สุดท้าย`);
    frameIndex++;
  }

  console.log(`\n✅ สร้าง frames เสร็จ รวม ${frameIndex - 1} frames`);
  return true;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== STEP 1: สร้าง frames ===");
  const ok = await generateFrames();
  if (!ok) return;

  console.log("\n=== STEP 2: สร้าง EPUB ===");

  console.log("\n✅ ทุกอย่างเสร็จสิ้น");
}

main().catch(console.error);