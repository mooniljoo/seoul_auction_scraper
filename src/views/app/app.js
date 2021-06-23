const { ipcRenderer } = require("electron");
const puppeteer = require("puppeteer");
const rootPath = require("electron-root-path").rootPath;
const shell = require("electron").shell;

let boolRunning = true;

document.addEventListener("DOMContentLoaded", (event) => {
  console.log("Scraper DOM fully loaded");
  document.getElementById("input_dirPath").value = rootPath;
});

function openDialogMsg(msg) {
  ipcRenderer.sendSync("openDialogMsg", msg);
}
function openDialogError(msg) {
  ipcRenderer.sendSync("openDialogError", msg);
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

function openDir(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  let dirPath = document.getElementById("input_dirPath").value;
  console.log("open the folder", dirPath);
  shell.openExternal(dirPath);
}
function onCancel(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  // show msg to screen for user
  document.getElementById("stateMsg").innerText = "취소중입니다...";
  boolRunning = false;
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
    console.error("적어도 하나는 선택해야 합니다.");
    return false;
  }
  return arrAuction;
}
async function configureBrowser() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--window-size=1280,1080"],
  });
  return browser;
}
async function scraper(url) {
  setLoading();
  const arrAuction = getArrAuction();
  const arrClosedAuction = [];
  const arrOpenedAuction = [];
  const arrSuccessfulAuctionsSaved = [];
  const arrFailedAuctionsSaved = [];
  if (!arrAuction) return false;

  //ready for browser
  const browser = await configureBrowser();
  let page = await browser.newPage();
  //access the website
  await page.goto(url, { waitUntil: "networkidle0" });

  // close the modal
  await page.waitForTimeout(500);
  const button_closeModal = await page.$("#closebtn");
  if (button_closeModal != null) button_closeModal.click();
  await page.waitForTimeout(1000);

  //DEPTH 1 : auction
  while (boolRunning) {
    let auctionResult = [];
    let source = "";
    let transactDate = "";
    // select the auction
    console.log(arrAuction[0]);
    let selector_auction;
    if (arrAuction[0] == "major") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(1) > ul > li:nth-child(1)";
    } else if (arrAuction[0] == "online") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(1)";
    } else if (arrAuction[0] == "artsy") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(3)";
    } else if (arrAuction[0] == "zero") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(5)";
    } else {
      console.error(
        "웹사이트의 구조가 바뀌었거나 선택하여 불러오려고 하는 옥션의 설정값이 시스템에 저장되어 있지 않습니다."
      );
      break;
    }

    //access the nav
    await page.waitForSelector(".fl_menu > li", { timeout: 0 });
    await page.hover(".fl_menu > li");
    await page.waitForTimeout(2000);

    console.log(selector_auction);
    await page.waitForSelector(selector_auction, { timeout: 0 });

    const button_auction = await page.$(selector_auction + " > span > a");
    console.log(button_auction);
    if (button_auction == null) {
      console.log(
        `선택자(${
          selector_auction + "> a"
        })가 페이지상에 존재하지 않은 것으로 보아 ${
          arrAuction[0]
        }경매는 아직 열리지 않았습니다.`
      );
      arrClosedAuction.push(arrAuction[0]);
    } else {
      arrOpenedAuction.push(arrAuction[0]);
      console.log("AUCTION BUTTON CLICK!");
      button_auction.click();

      // parsing outer description of artwork
      await page.waitForTimeout(500);

      let outerDesc;
      let winningBid = "";
      let winningBidUnit = "";
      const elem_source = await page.waitForSelector(
        "div.tit > span:nth-child(2)",
        { timeout: 0 }
      );
      source = await elem_source.evaluate((el) => el.innerText);
      console.log(`source : ${source}`);

      const elem_transactDate = await page.waitForSelector(
        "div.sub.lotlist_memobox > p.ng-scope > span.ng-binding",
        { timeout: 0 }
      );
      transactDate = await elem_transactDate.evaluate((el) => el.innerText);
      outerDesc = { source, transactDate, winningBid, winningBidUnit };

      // DEPTH 2 : pagination
      let url = page.url().split("&lang=ko#page")[0];
      let pageIndex = parseInt(await page.url().split("&lang=ko#page")[1]);
      while (boolRunning) {
        //check if page is indexpage or not
        if (page.url() == "https://www.seoulauction.com/")
          throw new Error("Index page has been reached.");
        ///// ready for next page
        // await page.waitForTimeout(1000);
        // await page.waitForSelector("div.left .page_ul", { timeout : 0 });
        // const arrPagination = await page.$$("div.left .page_ul > li > a");
        // console.log(`(${pageIndex} / ${arrPagination.length})`);
        // if (pageIndex == arrPagination.length - 2) break;
        // console.log("pageIndex", pageIndex);
        // arrPagination[pageIndex].click();
        console.log("\nTRY TO GO NEW PAGE", pageIndex);
        await page.goto(url + "&lang=ko#page" + pageIndex, {
          waitUntil: "networkidle0",
        });
        console.log(
          "pageIndex",
          parseInt(await page.url().split("&lang=ko#page")[1])
        );
        await page.waitForTimeout(1000);
        const arrArtwork = await page.$$("#auctionList > li");
        if (arrArtwork.length == 0 || arrArtwork == null) {
          console.log("LAST PAGE IS REACHED");
          break;
        }
        // DEPTH 3 : artwork
        let artworkIndex = 0;
        let artworkCount = 0;
        while (boolRunning) {
          await page.waitForTimeout(500);
          console.log(
            "pageIndex",
            parseInt(await page.url().split("&lang=ko#page")[1])
          );
          await page.waitForSelector("#auctionList > li", { timeout: 0 });
          const arrArtwork = await page.$$("#auctionList > li");
          artworkCount = arrArtwork.length;
          //check if artwork exists
          if (artworkIndex == arrArtwork.length) break;
          //access to new artwork page
          if (
            (await arrArtwork[artworkIndex].$("div.cancel.ng-hide")) != null
          ) {
            console.log("TRY TO GO DETAIL PAGE");
            let link = await arrArtwork[artworkIndex].$(".info > a");
            link.click();
            // parsing
            console.log("TRY TO GO PARSING");
            await page.waitForTimeout(500);
            let innerDesc = await parsing(page);
            description = { ...outerDesc, ...innerDesc };
            console.log(
              `(${artworkIndex + 1}/${artworkCount}) ${description.number}|${
                description.artistKr || description.artistEn
              }|${description.titleKr || description.titleEn} has completed.\n`
            );
            auctionResult.push(description);
            // displaying description
            await display_table([description]);
            // go again
            console.log("TRY TO GO BACK\n");
            // await page.goBack();
            await page.goto(url + "&lang=ko#page" + pageIndex, {
              waitUntil: "networkidle0",
            });
            await page.waitForTimeout(500);
            console.log(
              "pageIndex",
              parseInt(await page.url().split("&lang=ko#page")[1])
            );
          }
          artworkIndex++;
        }
        pageIndex++;
      }
      console.log(`${arrAuction[0]}경매 파싱을 마쳤습니다.`);

      console.log(
        `${auctionResult.length}개의 작품이 ${arrAuction[0]}경매에서 파싱되었습니다.`
      );
    }
    // get directory path to save
    let dirPath = document.getElementById("input_dirPath").value;
    if (auctionResult.length != 0) {
      let resp = String(
        ipcRenderer.sendSync(
          "create_xlsx",
          auctionResult,
          dirPath,
          arrAuction[0]
        )
      );
      if (!resp.includes("Error")) {
        arrSuccessfulAuctionsSaved.push(resp);
      } else {
        arrFailedAuctionsSaved.push(resp);
      }
    }
    arrAuction.shift();

    if (arrAuction.length == 0) break;
  }
  console.log(
    "ALL LOOPS ARE OVER. A SCRAPER IS ABOUT TO TRY TO TERMINATE THE BROWSER."
  );
  ///////////////// LOOPS /////////////////

  // terminate browser
  browser.close();
  // unset loading state
  unsetLoading();
  //return result
  if (boolRunning) {
    return {
      arrOpenedAuction: arrOpenedAuction,
      arrClosedAuction: arrClosedAuction,
      arrSuccessfulAuctionsSaved: arrSuccessfulAuctionsSaved,
      arrFailedAuctionsSaved: arrFailedAuctionsSaved,
    };
  } else {
    //init toggleCancel
    boolRunning = true;
    return null;
  }
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
function onSubmit(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  if (!validate()) return;
  console.log("RUN!");
  //init url
  let url = "https://www.seoulauction.com/";
  // run scrpaer
  scraper(url)
    .then((res) => {
      console.log(`↓ SCRAPER RESULT ↓\n${res}`);
      //write message for user
      let msg = "";
      if (res == null) {
        msg = `취소되었습니다🔙`;
      } else {
        if (
          res.arrOpenedAuction.length > 0 &&
          res.arrSuccessfulAuctionsSaved.length != 0
        ) {
          if (res.arrClosedAuction.length != 0)
            msg += `열려있지 않은 ${res.arrClosedAuction} 경매를 제외한\n`;
          msg += `${res.arrSuccessfulAuctionsSaved} 저장이 완료되었습니다😁`;
          if (res.arrFailedAuctionsSaved.length != 0)
            msg += `\n하지만 ${res.arrClosedAuction}경매는 파일저장에 실패했습니다😶`;
        } else if (res.arrOpenedAuction.length == 0) {
          msg = `\n열려있는 경매가 없습니다😊`;
        } else {
          msg = `ERROR: scraper 결과를 분석할수 없습니다🤦‍♂ \n${res}`;
        }
      }
      //report result for user
      openDialogMsg(msg);
    })
    .catch((err) => {
      console.error(err);
      openDialogError(err);
    });
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
function openDir(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  let dirPath = document.getElementById("input_dirPath").value;
  console.log("open the folder", dirPath);
  shell.openExternal(dirPath);
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
