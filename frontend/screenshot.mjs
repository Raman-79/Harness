import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'frontend-screenshot.png' });
  
  // Close sidebar if there's a close button
  try {
    await page.click('button[aria-label="Close sidebar"]');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'frontend-closed-sidebar.png' });
  } catch (e) {
    console.log("Could not click Close sidebar button");
  }

  await browser.close();
})();
