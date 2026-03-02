const fs = require("fs");
const path = require("path");
const https = require("https");

async function downloadImages() {

  // 🔥 Get JSON filename from terminal
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.log("❌ Please provide a JSON file.");
    console.log("Example: node downloadImages.js sucre.json");
    return;
  }

  if (!fs.existsSync(inputFile)) {
    console.log("❌ File not found:", inputFile);
    return;
  }

  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));

  // 🔥 Folder name = JSON name without .json
  const folderName = path.basename(inputFile, ".json");
  const imagesDir = path.join(__dirname, folderName);

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }

  console.log("Downloading images from:", inputFile);
  console.log("Saving to folder:", folderName);

  let downloaded = 0;

  for (let i = 0; i < data.length; i++) {

    const product = data[i];

    if (!product.image || !product.image.startsWith("http")) {
      console.log(`❌ Skipping (no image): ${product.name}`);
      continue;
    }

    const safeName = product.name
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    const extension = product.image.split(".").pop().split("?")[0];

    const filePath = path.join(imagesDir, `${safeName}.${extension}`);

    await new Promise((resolve) => {
      const file = fs.createWriteStream(filePath);

      https.get(product.image, response => {
        response.pipe(file);

        file.on("finish", () => {
          file.close(resolve);
        });
      }).on("error", () => {
        fs.unlink(filePath, () => {});
        console.log("Download error:", product.name);
        resolve();
      });
    });

    downloaded++;

    console.log(`✅ Downloaded ${downloaded}/${data.length} → ${product.name}`);
  }

  console.log("🎉 All images downloaded for:", inputFile);
}

downloadImages();
