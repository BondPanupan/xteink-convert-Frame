const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const inputFolder = "./output";
const epubFolder = "./epub";
const outputEpub = "./epub/book.epub";

const BOOK_TITLE = "My Book";
const BOOK_AUTHOR = "Author";
const BOOK_LANGUAGE = "th";

async function main() {
  if (!fs.existsSync(epubFolder)) {
    fs.mkdirSync(epubFolder, { recursive: true });
  }

  const files = fs.readdirSync(inputFolder)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.log("ไม่พบไฟล์ภาพใน ./output");
    return;
  }

  console.log(`พบ ${files.length} frames`);

  const uid = "book-" + Date.now();

  // --- mimetype ---
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
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems}
    ${spineItems}
  </manifest>
  <spine toc="ncx">
    ${spineRefs}
  </spine>
</package>`;

  // --- toc.ncx ---
  const navPoints = files.map((f, i) => `
    <navPoint id="nav${i}" playOrder="${i + 1}">
      <navLabel><text>Frame ${i + 1}</text></navLabel>
      <content src="pages/page${i}.xhtml"/>
    </navPoint>`).join("");

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
  </head>
  <docTitle><text>${BOOK_TITLE}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`;

  // --- page xhtml per frame ---
  const pages = files.map((f, i) => ({
    name: `page${i}.xhtml`,
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Frame ${i + 1}</title>
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

  // --- build epub (zip) ---
  console.log("\nสร้าง EPUB...");
  const output = fs.createWriteStream(outputEpub);
  const archive = archiver("zip", { store: true });

  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    // mimetype ต้องเป็น file แรก และห้าม compress
    archive.append(mimetype, { name: "mimetype", store: true });

    // META-INF
    archive.append(containerXml, { name: "META-INF/container.xml" });

    // OEBPS
    archive.append(contentOpf, { name: "OEBPS/content.opf" });
    archive.append(tocNcx, { name: "OEBPS/toc.ncx" });

    // pages
    for (const page of pages) {
      archive.append(page.content, { name: `OEBPS/pages/${page.name}` });
    }

    // images
    for (const f of files) {
      archive.file(path.join(inputFolder, f), { name: `OEBPS/images/${f}` });
    }

    archive.finalize();
  });

  console.log(`✅ เสร็จสิ้น → ${outputEpub} (${files.length} pages)`);
}

main().catch(console.error);