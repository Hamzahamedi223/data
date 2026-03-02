const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function repairMissingImages() {

  // 🔥 Get filename from command line
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.log("❌ Please provide a JSON file.");
    console.log("Example: node repairImages.js salee.json");
    return;
  }

  if (!fs.existsSync(inputFile)) {
    console.log("❌ File not found:", inputFile);
    return;
  }

  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));

  const productsWithoutImage = data.filter(
    p => !p.image || p.image.trim() === ""
  );

  console.log("File:", inputFile);
  console.log("Products missing image:", productsWithoutImage.length);

  if (productsWithoutImage.length === 0) {
    console.log("Nothing to repair.");
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  for (let i = 0; i < data.length; i++) {

    if (data[i].image && data[i].image.trim() !== "") continue;

    console.log(`Repairing: ${data[i].name}`);

    const page = await browser.newPage();

    await page.goto(data[i].link, {
      waitUntil: "networkidle2",
      timeout: 0
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const image = await page.evaluate(() => {

      const links = Array.from(document.querySelectorAll("a"));

      const imageLinks = links
        .map(a => a.href)
        .filter(href =>
          href.includes("/media/catalog/product/") &&
          (href.endsWith(".webp") ||
           href.endsWith(".jpg") ||
           href.endsWith(".jpeg") ||
           href.endsWith(".png"))
        );

      return imageLinks.length > 0 ? imageLinks[0] : "";
    });

    await page.close();

    if (image) {
      data[i].image = image;
      console.log("✅ Fixed:", data[i].name);
    } else {
      console.log("❌ Still no image:", data[i].name);
    }

    // Save progressively
    fs.writeFileSync(
      inputFile,
      JSON.stringify(data, null, 2)
    );
  }

  await browser.close();

  console.log("🎉 Repair process finished for:", inputFile);
}

repairMissingImages();
