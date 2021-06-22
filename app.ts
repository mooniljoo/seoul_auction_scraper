// const { ipcRenderer } = require("electron");
// const rootPath = require("electron-root-path").rootPath;
// const shell = require("electron").shell;
const puppeteer = require("puppeteer");

const major: string =
  "https://www.seoulauction.com/currentAuction?sale_kind=offline_only&page=1&lang=ko#page";
const online: string =
  "https://www.seoulauction.com/currentAuction?sale_kind=online_only&page=1&lang=ko#page";
const artsy: string =
  "https://www.seoulauction.com/currentAuction?sale_outside_yn=Y&lang=ko#page";

const urlList: any = {
  major: { url: major },
  online: { url: online },
  artsy: { url: artsy },
};
const auctionList: string[] = ["major", "online", "artsy"];

async function configureBrowser() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--window-size=1280,1080"],
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  return browser;
}

async function createPage(browser: any) {
  const page = await browser.newPage();
  return page;
}
async function goPage(page: any, url: string) {
  //access the website
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

async function parsing(page: any) {
  let description: object = await page.evaluate((html: any) => {
    let number = html.querySelector(
      ".author span.ng-binding.ng-scope"
    )?.innerText;

    let artistKr = html.querySelector(".author .name")?.innerText;

    let artistEn = html
      .querySelector(".author .lang")
      ?.innerText.replace(/[^a-zA-Z]*$/, "");

    let titleKr = html.querySelector(".tit p:nth-child(1)").innerText;
    let titleEn = html.querySelector(".tit p:nth-child(2)").innerText;
    if (!/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(titleKr)) {
      titleEn = titleKr;
      titleKr = "";
    }

    let material = html.querySelector(
      'span[ng-if="lot.MATE_NM_EN"]'
    )?.innerText;

    let size = html.querySelector(
      'p[ng-repeat="size in lot.LOT_SIZE_JSON"]'
    )?.innerText;
    let edition = html.querySelector(
      ".title .mat span[ng-bind='lot.EDITION']"
    )?.innerText;
    edition = edition == undefined ? "" : edition;
    let sizeEdition = size + " " + edition;
    let year = html.querySelector(
      'p[ng-if="lot.MAKE_YEAR_JSON[locale]"]'
    )?.innerText;

    let signPosition = html.querySelector(
      'p[ng-if="lot.SIGN_INFO_JSON[locale]"] > span> span:nth-child(1)'
    )?.innerText;

    let estimate = html.querySelector(
      ".price .mat > div p:nth-child(1)"
    )?.innerText;

    let estimateUnit = estimate?.replace(/[^a-zA-z\s]/g, "").trim();
    let estimateMin = estimate
      ?.split("~")[0]
      .replace(/[a-zA-z\s]/g, "")
      .trim();
    let estimateMax = estimate?.split("~")[1];

    let materialKr = material?.replace(/[^ㄱ-ㅎ|가-힣|\s]/g, "").trim();
    let materialEn = material?.replace(/[ㄱ-ㅎ|가-힣]/g, "").trim();

    let certi = "";
    let auctionTitle = html.querySelector("title")?.innerText;
    number = number == undefined ? "" : number;
    artistKr = artistKr == undefined ? "" : artistKr;
    artistEn = artistEn == undefined ? "" : artistEn;
    titleKr = titleKr == undefined ? "" : titleKr;
    titleEn = titleEn == undefined ? "" : titleEn;
    year = year == undefined ? "" : year;
    certi = certi == undefined ? "" : certi;
    sizeEdition = sizeEdition == undefined ? "" : sizeEdition;
    materialKr = materialKr == undefined ? "" : materialKr;
    materialEn = materialEn == undefined ? "" : materialEn;
    signPosition = signPosition == undefined ? "" : signPosition;
    auctionTitle = auctionTitle == undefined ? "" : auctionTitle;
    estimateUnit = estimateUnit == undefined ? "" : estimateUnit;
    estimateMin = estimateMin == undefined ? "" : estimateMin;
    estimateMax = estimateMax == undefined ? "" : estimateMax;
    return {
      auctionTitle,
      number,
      artistKr,
      artistEn,
      titleKr,
      titleEn,
      year,
      certi,
      sizeEdition,
      materialKr,
      materialEn,
      signPosition,
      estimateUnit,
      estimateMin,
      estimateMax,
    };
  });
  return description;
}

async function scraper(page: any) {
  let outerDesc: object;
  let innerDesc: object;
  let descriptionList: object[] = [];

  //get title
  const elem_title = await page.waitForSelector("div.title", { timeout: 5000 });
  const auctionTitle: object = await elem_title.evaluate((html: any) => {
    const source = html.querySelector(
      'div.tit > span[ng-bind="sale.TITLE_JSON[locale]"]'
    )?.innerText;
    const transactDate = html.querySelector(
      "div.sub.lotlist_memobox > p.ng-scope > span.ng-binding"
    )?.innerText;
    return { source, transactDate };
  });
  outerDesc = { ...auctionTitle };

  //get artworks
  // page.waitForNavigation({
  //   waitUntil: "networkidle0",
  // })
  await page.waitForSelector("ul#auctionList > li .info > a", {
    timeout: 30000,
  });
  const pageIndex: number = parseInt(
    await page.url().split("&lang=ko#page")[1]
  );
  let artworkIndex: number = 0;
  while (true) {
    const artworkList: any[] = await page.$$("#auctionList > li .info > a");
    // check if artwork is exist or not
    if (artworkIndex == artworkList.length) break;

    //get winningBid
    let winningBidUnit: string = "";
    const elem_winningBid: any = await page.$(
      "strong[ng-class=\"{txt_impo:viewId == 'CURRENT_AUCTION'}\"]"
    );
    let winningBid: string =
      elem_winningBid == null
        ? ""
        : elem_winningBid.evaluate((html: any) => {
            return html?.innerText;
          });

    // go to detailPage
    await Promise.all([
      artworkList[artworkIndex].click(),
      page.waitForNavigation({
        waitUntil: "networkidle0",
      }),
    ]);

    //check if page is indexpage or not
    if (page.url() == "https://www.seoulauction.com/")
      throw new Error("Arrive to Index Page");

    //wait for load detailPage
    // await page.waitForTimeout(100);
    const detailPage = await page.waitForSelector("div.master_detail", {
      timeout: 5000,
    });

    //parsing detailPage
    innerDesc = await parsing(detailPage);
    if (innerDesc == undefined) console.error("파싱에 문제가 있습니다.");

    const description: any = {
      ...outerDesc,
      ...innerDesc,
      winningBid,
      winningBidUnit,
    };
    console.log(
      `Page ${pageIndex}\n(${artworkIndex + 1}/${artworkList.length})`
    );
    // console.log(description);
    console.log(description.number, description.artistKr);
    descriptionList.push(description);

    //go previous page
    await Promise.all([
      page.goBack({
        timeout: 5000,
        waitUntil: "networkidle0",
      }),
      page.waitForNavigation({
        waitUntil: "networkidle0",
      }),
    ]);
    //wait for load previous page
    // await page.waitForTimeout(700);
    artworkIndex++;
  }

  return descriptionList;
}

async function run() {
  //init browser
  const browser = await configureBrowser();
  let page: any = await createPage(browser);
  //auction loop
  let auctionIndex: number = 0;
  while (true) {
    //check if all the auctions have been explored or not
    if (auctionIndex == auctionList.length) break;

    //init variable
    let auctionResult: object[] = [];

    //init url for auction
    let url = urlList[auctionList[auctionIndex]].url;
    console.log(`TRY TO ${auctionList[auctionIndex]}`);

    // page loop
    let pageIndex: number = 1;
    while (true) {
      page = await goPage(page, url + pageIndex);

      // check if page is disabled or not.
      page.on("dialog", async (dialog: any) => {
        console.log(dialog.message());
        await dialog.dismiss();
      });
      // check if page is active or not
      await page.waitForTimeout(100);
      await page.waitForSelector("#auctionList > li", {
        timeout: 5000,
      });
      const elem_artworkList = await page.$$("#auctionList > li");
      if (elem_artworkList.length == 0) break;

      // run scraper
      await scraper(page)
        .then((pageResult) => {
          //page res
          auctionResult.push(...pageResult);
        })
        .catch((e) => {
          console.error(e);
          if (e.includes("index")) {
            console.log(
              `해당 ${auctionList[auctionIndex]} 경매가 열리지 않았습니다.`
            );
            pageIndex++;
          } else {
            console.error(e);
          }
        });
      pageIndex++;
    }
    console.log(`${auctionList[auctionIndex]} LOOP IS OVER.`);
    // save to xlsx
    //save_to_xlsx(auctionResult)

    auctionIndex++;
  }
  console.log("ALL LOOPS ARE OVER.");

  // browser.close();
}

function onSubmit(): void {
  run().then((res) => console.log("FinalResult", res));
}

onSubmit();
