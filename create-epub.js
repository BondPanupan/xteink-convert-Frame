const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const inputFolder = "./output";
const epubFolder = "./epub";
const outputEpub = "./epub/imperfection-02.epub";

const BOOK_TITLE = "imperfection-02";
const BOOK_AUTHOR = "Author";
const BOOK_LANGUAGE = "th";

async function main() {
  if (!fs.existsSync(epubFolder)) {
    fs.mkdirSync(epubFolder, { recursive: true });
  }

  // ✅ natural sort (สำคัญ)
  const files = fs.readdirSync(inputFolder)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    console.log("ไม่พบไฟล์ภาพใน ./output");
    return;
  }

  console.log(`พบ ${files.length} frames`);

  const uid = "book-" + Date.now();
  const mimetype = "application/epub+zip";

  // --- container.xml ---
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:schemas:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // --- content.opf ---
  const manifestItems = files.map((f, i) =>
    `<item id="img${i}" href="images/${f}" media-type="${f.match(/\.png$/i) ? "image/png" : "image/jpeg"}"/>`
  ).join("\n    ");

  const spineItems = files.map((f, i) =>
    `<item id="page${i}" href="pages/page${i}.xhtml" media-type="application/xhtml+xml"/>`
  ).join("\n    ");

  const spineRefs = files.map((f, i) =>
    `<itemref idref="page${i}"/>`
  ).join("\n    ");

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:title>${BOOK_TITLE}</dc:title>
    <dc:creator>${BOOK_AUTHOR}</dc:creator>
    <dc:language>${BOOK_LANGUAGE}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${manifestItems}
    ${spineItems}
  </manifest>
  <spine>
    ${spineRefs}
  </spine>
</package>`;

  // ✅ EPUB 3 ต้องมี nav.xhtml (บางเครื่องไม่อ่าน toc.ncx)
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>TOC</title></head>
<body>
<nav epub:type="toc">
  <ol>
    ${files.map((f, i) => `<li><a href="pages/page${i}.xhtml">Frame ${i + 1}</a></li>`).join("")}
  </ol>
</nav>
</body>
</html>`;

  // --- pages ---
  const pages = files.map((f, i) => ({
    name: `page${i}.xhtml`,
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Frame ${i + 1}</title>
  <meta name="viewport" content="width=device-width, height=device-height"/>
  <style>
    body { margin: 0; padding: 0; background: #000; }
    img { width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <img src="../images/${f}" alt="Frame ${i + 1}"/>
</body>
</html>`
  }));

  // --- build epub ---
  console.log("\nสร้าง EPUB...");
  const output = fs.createWriteStream(outputEpub);
  const archive = archiver("zip");

  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    // ❗ สำคัญ: mimetype ต้องไม่ compressed + ต้องเป็น file แรก
    archive.append(mimetype, { name: "mimetype", store: true });

    archive.append(containerXml, { name: "META-INF/container.xml" });

    archive.append(contentOpf, { name: "OEBPS/content.opf" });
    archive.append(navXhtml, { name: "OEBPS/nav.xhtml" });

    for (const page of pages) {
      archive.append(page.content, { name: `OEBPS/pages/${page.name}` });
    }

    for (const f of files) {
      archive.file(path.join(inputFolder, f), { name: `OEBPS/images/${f}` });
    }

    archive.finalize();
  });

  console.log(`✅ เสร็จสิ้น → ${outputEpub} (${files.length} pages)`);
}

main().catch(console.error);