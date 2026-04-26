const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputFolder = "./images/imperfection-02";
const outputFolder = "./crop";

// 2cm ≈ 75-80 pixels (ขึ้นอยู่กับ DPI)
// ปรับค่านี้ตามต้องการ
const cropPixelsFromRight = 180;

async function cropImages() {
  try {
    // สร้าง output folder ถ้ายังไม่มี
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // อ่านรูปภาพทั้งหมดจาก input folder
    const files = fs.readdirSync(inputFolder);
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    console.log(`พบรูปภาพ ${imageFiles.length} รูป`);

    for (const file of imageFiles) {
      const inputPath = path.join(inputFolder, file);
      const outputPath = path.join(outputFolder, `${file}`);

      try {
        // สำรวจขนาดของรูปภาพ
        const image = sharp(inputPath).withMetadata(false);
        const metadata = await image.metadata();
        let { width, height, orientation } = metadata;

        // ถ้ามี EXIF rotation ให้หมุนกลับให้ตั้ง
        if (orientation && [5, 6, 7, 8].includes(orientation)) {
          // ต้องหมุนรูปให้ถูกทิศ
          width = metadata.height;
          height = metadata.width;
        }

        // Crop จากขวา: ตำแหน่ง left, top, width, height
        // width ใหม่ = width เดิม - cropPixelsFromRight
        await sharp(inputPath)
          .rotate() // อ่านและซ่อมแซม EXIF orientation
          .extract({
            left: 0,
            top: 0,
            width: width - cropPixelsFromRight,
            height: height,
          })
          .toFile(outputPath);

        console.log(`✓ ${file} (${width}x${height} → ${width - cropPixelsFromRight}x${height})`);
      } catch (error) {
        console.error(`✗ ข้อผิดพลาดในการประมวลผล ${file}:`, error.message);
      }
    }

    console.log("\n✓ เสร็จสิ้น!");
  } catch (error) {
    console.error("ข้อผิดพลาด:", error);
  }
}

cropImages();