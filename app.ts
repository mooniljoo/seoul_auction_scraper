// const { ipcRenderer } = require("electron");
// const rootPath = require("electron-root-path").rootPath;

import { ConsoleMessage } from "puppeteer";

// const shell = require("electron").shell;
const puppeteer = require("puppeteer");
const jsonToXlsx = require("./src/utils/sheetJs");

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
    // executablePath:
    //   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  return browser;
}

async function createPage(browser: any) {
  const page = await browser.newPage();
  return page;
}
async function goPage(page: any, url: string) {
  //access the website
  await page.goto(url, { waitUntil: "networkidle0" });
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
  console.log("TRY TO GET auctionTitle");
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
  page.waitForNavigation({
    waitUntil: "networkidle0",
    // Remove the timeout
    timeout: 0,
  });

  const pageIndex: number = parseInt(
    await page.url().split("&lang=ko#page")[1]
  );
  let artworkIndex: number = 0;
  console.log("START TO LOOP");
  const artworkList: any[] = await page.$$("#auctionList > li .info > a");
  while (true) {
    console.log("LOOPING...");
    // check if artwork is exist or not

    console.log(
      "아트워크상세페이지버튼 type",
      typeof artworkList[artworkIndex]
    );
    console.log(
      "is 아트워크상세페이지버튼 null?",
      artworkList[artworkIndex] == null
    );
    console.log(
      "is 아트워크상세페이지버튼 undefined?",
      artworkList[artworkIndex] == undefined
    );
    if (artworkIndex == artworkList.length) break;

    //get winningBid
    let winningBidUnit: string = "";
    console.log("page", typeof page);
    const elem_winningBid: any = await page.$$(
      "strong[ng-class=\"{txt_impo:viewId == 'CURRENT_AUCTION'}\"]"
    );
    let winningBid: string =
      elem_winningBid.length == 0
        ? ""
        : elem_winningBid[0].evaluate((html: any) => {
            return html?.innerText;
          });

    // go to detailPage
    // await artworkList[artworkIndex].click();
    await Promise.all([
      artworkList[artworkIndex].click(),
      page.waitForNavigation({
        waitUntil: "networkidle0",
        // Remove the timeout
        timeout: 0,
      }),
    ]);

    //check if page is indexpage or not
    if (page.url() == "https://www.seoulauction.com/")
      throw new Error("Index page has been reached.");

    //wait for load detailPage
    // await page.waitForTimeout(100);
    console.log(`WAIT FOR detail page`);
    const detailPage = await page.waitForSelector("div.master_detail", {
      // Remove the timeout
      timeout: 0,
    });

    //parsing detailPage
    console.log(`TRY TO parsing the page`);
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
    console.log(description.number, description.artistKr, description.titleKr);
    descriptionList.push(description);

    //go previous page
    page.goBack({
      waitUntil: "networkidle0",
      // Remove the timeout
      timeout: 0,
    });
    // await Promise.all([
    //   page.goBack({
    //     timeout: 5000,
    //     waitUntil: "networkidle0",
    //   }),
    //   page.waitForNavigation({
    //     waitUntil: "networkidle0",
    //   }),
    // ]);
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

  //access index page
  console.log(`TRY TO access index page`);
  page = await goPage(page, "https://www.seoulauction.com/");
  // close the modal
  console.log(`TRY TO check the modal`);
  const button_closeModal = await page.$("#closebtn");
  if (button_closeModal != null) button_closeModal.click();
  // await page.waitForTimeout(3000);

  //init variables
  let finalResult: string[] = [];
  let arrClosedAuction: string[] = [];
  let arrOpenAuction: string[] = [];
  let auctionIndex: number = 0;
  let selector_auction: string;
  while (true) {
    if (auctionIndex == auctionList.length) break;
    console.log(`TRY TO ${auctionList[auctionIndex]} SELECT auction`);
    if (auctionList[auctionIndex] == "major") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(1) > ul > li:nth-child(1)";
    } else if (auctionList[auctionIndex] == "online") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(1)";
    } else if (auctionList[auctionIndex] == "artsy") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(3)";
    } else if (auctionList[auctionIndex] == "zero") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(5)";
    } else {
      console.error(
        "웹사이트의 구조가 바뀌었거나 선택하여 불러오려고 하는 옥션의 설정값이 시스템에 저장되어 있지 않습니다."
      );
      break;
    }
    //access the nav
    console.log(`TRY TO ACCESS ${auctionList[auctionIndex]} nav`);
    await page.waitForSelector(".fl_menu > li", { timeout: 5000 });
    await page.hover(".fl_menu > li");
    await page.waitForTimeout(2000);

    console.log(`TRY TO ACCESS ${auctionList[auctionIndex]} selector_auction`);
    await page.waitForSelector(selector_auction, { timeout: 5000 });

    console.log(`TRY TO ACCESS ${auctionList[auctionIndex]} button_auction`);
    const button_auction = await page.$(selector_auction + " > span > a");
    if (button_auction == null) {
      console.log(
        `선택자(${
          selector_auction + "> a"
        })가 페이지상에 존재하지 않은 것으로 보아 ${
          auctionList[auctionIndex]
        }경매는 아직 열리지 않았습니다.`
      );
      arrClosedAuction.push(auctionList[auctionIndex]);
    } else {
      arrOpenAuction.push(auctionList[auctionIndex]);
    }
    auctionIndex++;
  }

  console.log(`Open Auction : ${arrOpenAuction}`);
  console.log(`Closed Auction : ${arrClosedAuction}`);

  //auction loop
  let openedAuctionIndex: number = 0;
  while (true) {
    // check if opened auction exist or not
    if (arrOpenAuction.length == 0) {
      console.log("Open Auction does not exist");
      break;
    }
    //check if all the auctions have been explored or not
    if (openedAuctionIndex == arrOpenAuction.length) break;

    //init variable
    let auctionResult: object[] = [];

    //init url for auction
    let url = urlList[arrOpenAuction[openedAuctionIndex]].url;
    console.log(`TRY TO GET ${arrOpenAuction[openedAuctionIndex]}`);

    // page loop
    let pageIndex: number = 1;
    while (true) {
      page = await goPage(page, url + pageIndex);

      // check if page is disabled or not.
      page.on("dialog", async (dialog: any) => {
        console.log(dialog.message());
        await dialog.accept();
      });
      // check if page is active or not
      await page.waitForTimeout(100);
      // await page.waitForSelector("#auctionList > li", {
      //   timeout: 5000,
      // });
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
          if (String(e).includes("index")) {
            console.log(
              `해당 ${arrOpenAuction[openedAuctionIndex]} 경매가 열리지 않았습니다.`
            );
            pageIndex++;
          } else {
            console.error(Object.keys(e));
            console.error(e.name);
            console.error(e.message);
            return;
          }
        });
      pageIndex++;
    }
    console.log(`${arrOpenAuction[openedAuctionIndex]} LOOP IS OVER.`);
    // save to xlsx
    console.log("TRY TO save to xlsx");
    try {
      let fileName: string = jsonToXlsx.write(
        "/",
        arrOpenAuction[openedAuctionIndex],
        210623,
        auctionResult
      );
      finalResult.push(fileName);
    } catch (e) {
      console.error(e);
    }

    openedAuctionIndex++;
  }
  console.log("ALL LOOPS ARE OVER.");

  // browser.close();
  return finalResult;
}

function onSubmit(): void {
  run().then((res) => console.log("FinalResult", res));
}

onSubmit();
