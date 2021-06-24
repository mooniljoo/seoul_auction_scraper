const { ipcRenderer } = require("electron");
const rootPath = require("electron-root-path").rootPath;
const shell = require("electron").shell;
const puppeteer = require("puppeteer");

let boolRunning = true;

document.addEventListener("DOMContentLoaded", (event) => {
  console.log("Scraper DOM fully loaded");
  document.getElementById("input_dirPath").value = rootPath;
});

function onCancel(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  // show msg to screen for user
  document.getElementById("stateMsg").innerText = "취소중입니다...";
  boolRunning = false;
}
function setLoading() {
  document.getElementById("stateMsg").innerText = "불러오는 중입니다...";
  document.querySelector(".state").classList.add("on");
  document.getElementById("btnRunning").classList.add("disabled");
  document.getElementById("btnSelectDirPath").classList.add("disabled");
  document.getElementById("btnOpenDir").classList.add("disabled");
  document.getElementById("btnCancel").classList.remove("disabled");
  document.getElementById("btnCancel").classList.remove("disabled");
  let = allCheckbox = document.querySelectorAll(
    "#wrapper_checkbox input[type=checkbox]"
  );
  for (let i = 0; i < allCheckbox.length; i++) {
    allCheckbox[i].setAttribute("disabled", "disabled");
  }
}
function unsetLoading() {
  document.querySelector(".state").classList.remove("on");
  document.getElementById("btnRunning").classList.remove("disabled");
  document.getElementById("btnSelectDirPath").classList.remove("disabled");
  document.getElementById("btnOpenDir").classList.remove("disabled");
  document.getElementById("btnCancel").classList.add("disabled");
  let = allCheckbox = document.querySelectorAll(
    "#wrapper_checkbox input[type=checkbox]"
  );
  for (let i = 0; i < allCheckbox.length; i++) {
    allCheckbox[i].removeAttribute("disabled");
  }
}

function openDialogMsg(msg) {
  ipcRenderer.sendSync("openDialogMsg", msg);
}
function openDialogError(msg) {
  ipcRenderer.sendSync("openDialogError", msg);
}
function openDir(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  let dirPath = document.getElementById("input_dirPath").value;
  console.log("open the folder", dirPath);
  shell.openExternal(dirPath);
}

function openDialogFile(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  // send to Main Process
  let resp = ipcRenderer.sendSync("openDialogFile", rootPath);
  // recv to Main Process
  if (resp.filePaths[0] != undefined)
    document.getElementById("input_dirPath").value = resp.filePaths[0];
}

function getArrAuction() {
  allCheckbox = document.querySelectorAll(
    "#wrapper_checkbox input[type=checkbox]"
  );
  let arrAuction = [];

  for (let i = 0; i < allCheckbox.length; i++) {
    if (allCheckbox[i].checked) {
      arrAuction.push(allCheckbox[i].value);
    }
  }
  if (arrAuction.length == 0) {
    let msg =
      "적어도 경매를 하나는 선택해야 합니다🤷‍♂️\n하나라도 체크해주세요!👍";
    console.log(msg);
    return false;
  }
  return arrAuction;
}

function validate() {
  allCheckbox = document.querySelectorAll(
    "#wrapper_checkbox input[type=checkbox]"
  );
  let arrAuction = [];

  for (let i = 0; i < allCheckbox.length; i++) {
    if (allCheckbox[i].checked) {
      arrAuction.push(allCheckbox[i].value);
    }
  }
  if (arrAuction.length == 0) {
    let msg =
      "적어도 경매를 하나는 선택해야 합니다🤷‍♂️\n하나라도 체크해주세요!👍";
    console.log(msg);
    openDialogMsg(msg);
    return null;
  } else {
    return true;
  }
}

function display_table(arr) {
  const tbody = document.getElementById("tbody");
  arr.forEach((item) => {
    tbody.innerHTML += `
        <tr>
            <td>${item.number}</td>
            <td>${item.artistKr}</td>
            <td>${item.artistEn}</td>
            <td>${item.titleKr}</td>
            <td>${item.titleEn}</td>
            <td>${item.year}</td>
            <td>${item.certi}</td>
            <td>${item.sizeEdition}</td>
            <td>${item.materialKr}</td>
            <td>${item.materialEn}</td>
            <td>${item.signPosition}</td>
            <td>${item.source}</td>
            <td>${item.auctionTitle}</td>
            <td>${item.transactDate}</td>
            <td>${item.winningBidUnit}</td>
            <td>${item.winningBid}</td>
            <td>${item.estimateUnit}</td>
            <td>${item.estimateMin}</td>
            <td>${item.estimateMax}</td>
        </tr>
`;
  });
}

const major =
  "https://www.seoulauction.com/currentAuction?sale_kind=offline_only&page=1&lang=ko#page";
const online =
  "https://www.seoulauction.com/currentAuction?sale_kind=online_only&page=1&lang=ko#page";
const artsy =
  "https://www.seoulauction.com/currentAuction?sale_outside_yn=Y&lang=ko#page";
const zero =
  "https://www.seoulauction.com/currentAuction?sale_kind=zerobase_only&page=1&lang=ko#page";

const urlList = {
  major: { url: major },
  online: { url: online },
  artsy: { url: artsy },
  zero: { url: zero },
};

async function configureBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--window-size=1280,1080"],
    // executablePath:
    //   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  return browser;
}

async function createPage(browser) {
  const page = await browser.newPage();
  return page;
}
async function goPage(page, url) {
  //access the website
  await page.goto(url, { waitUntil: "networkidle0" });
  return page;
}

async function parsing(page) {
  console.log("PARSING...");
  let description = await page.evaluate(() => {
    // let auctionTitle = document.querySelector(
    //   "#container > div.contents_wrap > div > div.state_wrap > div > div > div:nth-child(1) > ul > li:nth-child(1)"
    // );
    // auctionTitle =
    //   auctionTitle == null
    //     ? document.querySelector(
    //         "#container > div.contents_wrap > div > div.state_wrap > div > div > div:nth-child(1)"
    //       ).innerText
    //     : auctionTitle?.innerText;
    let number = document.querySelector(
      ".author span.ng-binding.ng-scope"
    )?.innerText;

    let artistKr = document.querySelector(".author .name")?.innerText;

    let artistEn = document
      .querySelector(".author .lang")
      ?.innerText.replace(/[^a-zA-Z]*$/, "");

    let titleKr = document.querySelector(".tit p:nth-child(1)").innerText;
    let titleEn = document.querySelector(".tit p:nth-child(2)").innerText;
    if (!/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(titleKr)) {
      titleEn = titleKr;
      titleKr = "";
    }

    let material = document.querySelector(
      'span[ng-if="lot.MATE_NM_EN"]'
    )?.innerText;

    let size = document.querySelector(
      'p[ng-repeat="size in lot.LOT_SIZE_JSON"]'
    )?.innerText;
    let edition = document.querySelector(
      ".title .mat span[ng-bind='lot.EDITION']"
    )?.innerText;
    edition = edition == undefined ? "" : edition;
    let sizeEdition = size + " " + edition;
    let year = document.querySelector(
      'p[ng-if="lot.MAKE_YEAR_JSON[locale]"]'
    )?.innerText;

    let signPosition = document.querySelector(
      'p[ng-if="lot.SIGN_INFO_JSON[locale]"] > span> span:nth-child(1)'
    )?.innerText;

    let estimate = document.querySelector(
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
    let auctionTitle = document.querySelector("title")?.innerText;
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

async function scraper(page) {
  let outerDesc;
  let innerDesc;
  let descriptionList = [];
  let currentListPage = page.url();

  //get title
  console.log("TRY TO GET auctionTitle");
  const elem_title = await page.waitForSelector("div.title", { timeout: 0 });
  const auctionTitle = await elem_title.evaluate((html) => {
    const source = html.querySelector(
      'div.tit > span[ng-bind="sale.TITLE_JSON[locale]"]'
    ).innerText;
    const transactDate = html.querySelector(
      "div.sub.lotlist_memobox > p.ng-scope > span.ng-binding"
    ).innerText;
    return { source, transactDate };
  });
  outerDesc = { ...auctionTitle };

  //get artworks

  const pageIndex = parseInt(await page.url().split("&lang=ko#page")[1]);
  let artworkIndex = 0;
  console.log("START TO LOOP");
  // const artworkList = await page.$$("#auctionList > li .info > a");
  while (boolRunning) {
    console.log("LOOPING...");
    await page.waitForTimeout(500);
    await page.waitForSelector("#auctionList > li", { timeout: 0 });
    const artworkList = await page.$$("#auctionList > li");
    // check if artwork is exist or not
    if (artworkIndex == artworkList.length) break;

    if ((await artworkList[artworkIndex].$("div.cancel.ng-hide")) != null) {
      //get winningBid
      let winningBidUnit = "";
      console.log("page", typeof page);
      const elem_winningBid = await page.$$(
        "strong[ng-class=\"{txt_impo:viewId == 'CURRENT_AUCTION'}\"]"
      );
      let winningBid =
        elem_winningBid.length == 0
          ? ""
          : elem_winningBid[0].evaluate((html) => {
              return html.innerText;
            });

      console.log("TRY TO GO DETAIL PAGE");
      let link = await artworkList[artworkIndex].$(".info > a");
      // go to detailPage
      // await artworkList[artworkIndex].click();
      await Promise.all([
        link.click(),
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
      await page.waitForTimeout(500);
      innerDesc = await parsing(detailPage);
      if (innerDesc == undefined) console.error("파싱에 문제가 있습니다.");

      const description = {
        ...outerDesc,
        ...innerDesc,
        winningBid,
        winningBidUnit,
      };
      console.log(
        `Page ${pageIndex}\n(${artworkIndex + 1}/${artworkList.length})\n
        ${description.number}|${description.artistKr || description.artistEn}|${
          description.titleKr || description.titleEn
        }\n`
      );
      descriptionList.push(description);
      // displaying description
      await display_table([description]);

      //go previous page
      await page.goBack({
        waitUntil: "networkidle0",
        // Remove the timeout
        timeout: 0,
      });
      if ((await page.url()) != currentListPage) {
        await page.goto(currentListPage, {
          waitUntil: "networkidle0",
          // Remove the timeout
          timeout: 0,
        });
      }
    }
    // await Promise.all([
    //   page.goBack({
    //     timeout: 0,
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

async function run(url) {
  setLoading();

  //init variables
  let arrSuccessfulAuctionsSaved = [];
  let arrFailedAuctionsSaved = [];
  let arrClosedAuction = [];
  let arrOpenAuction = [];
  let browser;
  let page;
  let selector_auction;
  let auctionIndex = 0;
  const auctionList = getArrAuction();
  while (boolRunning) {
    //init browser
    browser = await configureBrowser();
    page = await createPage(browser);

    //access index page
    console.log(`TRY TO access index page`);
    page = await goPage(page, url);
    // close the modal
    console.log(`TRY TO check the modal`);
    const button_closeModal = await page.$("#closebtn");
    if (button_closeModal != null) button_closeModal.click();
    // await page.waitForTimeout(3000);
    break;
  }
  while (boolRunning) {
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
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(6)";
    } else {
      console.error(
        "웹사이트의 구조가 바뀌었거나 선택하여 불러오려고 하는 옥션의 설정값이 시스템에 저장되어 있지 않습니다."
      );
      break;
    }
    //access the nav
    console.log(`TRY TO ACCESS ${auctionList[auctionIndex]} nav`);
    await page.waitForSelector(".fl_menu > li", { timeout: 0 });
    await page.hover(".fl_menu > li");
    await page.waitForTimeout(2000);

    console.log(`TRY TO ACCESS ${auctionList[auctionIndex]} selector_auction`);
    await page.waitForSelector(selector_auction, { timeout: 0 });

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
  let openedAuctionIndex = 0;
  while (boolRunning) {
    // check if opened auction exist or not
    if (arrOpenAuction.length == 0) {
      console.log("Open Auction does not exist");
      break;
    }
    //check if all the auctions have been explored or not
    if (openedAuctionIndex == arrOpenAuction.length) break;

    //init variable
    let auctionResult = [];

    //init url for auction
    let url = urlList[arrOpenAuction[openedAuctionIndex]].url;
    console.log(`!! START TO ${arrOpenAuction[openedAuctionIndex]}`);

    // page loop
    let pageIndex = 1;
    while (boolRunning) {
      page = await goPage(page, url + pageIndex);

      await page.waitForSelector("li[title='Next Page']", {
        timeout: 0,
      });
      const lastPage = await page.$eval("li[title='Next Page']", (el) => {
        return parseInt(el.previousElementSibling.innerText);
      });
      console.log("lastPage", lastPage);
      console.log("pageIndex == lastPage", pageIndex == lastPage);
      if (pageIndex == lastPage + 1) break;

      // await page.waitForSelector("#auctionList > li", {
      //   timeout: 0,
      // });
      const elem_artworkList = await page.$$("#auctionList > li");
      console.log("elem_artworkList.length", elem_artworkList.length);
      if (elem_artworkList.length == 0) break;

      // check if page is disabled or not.
      page.on("dialog", async (dialog) => {
        console.log(dialog.message());
        await dialog.accept();
      });
      // check if page is active or not
      await page.waitForTimeout(100);

      // run scraper
      await scraper(page)
        .then((pageResult) => {
          //page res
          auctionResult.push(...pageResult);
        })
        .catch((e) => {
          console.error(e);
          if (e.message.includes("index")) {
            console.log(
              `해당 ${arrOpenAuction[openedAuctionIndex]} 경매가 열리지 않았습니다.`
            );
          } else {
            console.error(Object.keys(e));
            return;
          }
        });
      pageIndex++;
    }
    console.log(`${arrOpenAuction[openedAuctionIndex]} LOOP IS OVER.`);
    console.log(
      `${auctionResult.length}개의 작품이 ${arrOpenAuction[openedAuctionIndex]}경매에서 파싱되었습니다.`
    );
    // save to xlsx
    while (boolRunning) {
      // get directory path to save
      let dirPath = document.getElementById("input_dirPath").value;
      if (auctionResult.length == 0) break;
      console.log("TRY TO save to xlsx");
      let resp = String(
        ipcRenderer.sendSync(
          "create_xlsx",
          auctionResult,
          dirPath,
          arrOpenAuction[openedAuctionIndex]
        )
      );
      if (!resp.includes("Error")) {
        arrSuccessfulAuctionsSaved.push(resp);
      } else {
        arrFailedAuctionsSaved.push(resp);
      }
      break;
    }

    openedAuctionIndex++;
  }
  console.log("ALL LOOPS ARE OVER.");

  browser.close();
  unsetLoading();
  return {
    arrOpenAuction,
    arrClosedAuction,
    arrSuccessfulAuctionsSaved,
    arrFailedAuctionsSaved,
  };
}

function onSubmit(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  if (!validate()) return;
  let url = "https://www.seoulauction.com/";
  run(url)
    .then((res) => {
      console.log("↓ SCRAPER RESULT ↓\n", res);
      if (boolRunning) {
        let msg = "";
        if (res.arrOpenAuction.length == 0) msg += "열려있는 경매가 없습니다.";
        if (res.arrSuccessfulAuctionsSaved.length > 0)
          msg += `${res.arrSuccessfulAuctionsSaved} 경매를 저장했습니다.`;
        if (res.arrFailedAuctionsSaved.length > 0)
          msg += `${res.arrFailedAuctionsSaved} 경매는 저장에 실패했습니다.`;
        openDialogMsg(msg);
      } else {
        boolRunning = true;
      }
    })
    .catch((err) => {
      console.error(err);
      openDialogError(err);
    });
}
