const puppeteer = require("puppeteer");
const fs = require("fs");

async function scrapeCarrefour() {
  const browser = await puppeteer.launch({
    headless: true, // change to true when stable
    defaultViewport: null
  });

  const page = await browser.newPage();
  const allProducts = [];

  await page.goto(
    "https://www.carrefour.tn/hygiene-et-beaute.html?page=1",
    { waitUntil: "networkidle2", timeout: 0 }
  );

  await page.waitForSelector('a[class^="item-nameContainer"]');

  // 🔥 LOAD ALL PRODUCTS USING BUTTON
  let previousCount = 0;
  const maxClicks = 60;

  for (let i = 0; i < maxClicks; i++) {

    const currentCount = await page.$$eval(
      'a[class^="item-nameContainer"]',
      items => items.length
    );

    console.log("Current products:", currentCount);

    if (currentCount === previousCount) {
      console.log("No more new products.");
      break;
    }

    previousCount = currentCount;

    const buttonClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("span"))
        .find(el => el.innerText.includes("PRODUITS"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!buttonClicked) {
      console.log("Load more button not found.");
      break;
    }

    await page.waitForFunction(
      count =>
        document.querySelectorAll('a[class^="item-nameContainer"]').length > count,
      {},
      previousCount
    );
  }

  console.log("All products loaded.");

  // 🔥 EXTRACT LISTING DATA
  const listingProducts = await page.evaluate(() => {
    const items = document.querySelectorAll(
      'a[class^="item-nameContainer"]'
    );

    return Array.from(items).map(item => ({
      name:
        item.querySelector('span[class^="item-name"]')?.innerText.trim() || "",
      link: item.href || "",
      description:
        item.parentElement
          ?.querySelector('div[class^="richContent"]')
          ?.innerText.trim() || ""
    }));
  });

  console.log("Total products:", listingProducts.length);

  // 🔥 VISIT EACH PRODUCT PAGE
  for (let i = 0; i < listingProducts.length; i++) {

    const product = listingProducts[i];
    const productPage = await browser.newPage();

    await productPage.goto(product.link, {
      waitUntil: "networkidle2",
      timeout: 0
    });

    // small wait for carousel JS
 await new Promise(resolve => setTimeout(resolve, 1500));

    let image = await productPage.evaluate(() => {

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

    // 🔥 RETRY ONCE IF EMPTY
    if (!image) {
      console.log("Retrying image for:", product.name);

await new Promise(resolve => setTimeout(resolve, 1500));

      image = await productPage.evaluate(() => {

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
    }

    await productPage.close();

    const finalProduct = {
      name: product.name,
      description: product.description,
      link: product.link,
      image
    };

    allProducts.push(finalProduct);

    // ✅ SAVE PROGRESSIVELY
    fs.writeFileSync(
      "hygiene.json",
      JSON.stringify(allProducts, null, 2)
    );

    console.log(
      `✅ Saved ${i + 1}/${listingProducts.length} → ${product.name}`
    );
  }

  await browser.close();

  console.log("🎉 DONE. All products saved.");
}

scrapeCarrefour();
