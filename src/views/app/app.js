const { ipcRenderer } = require("electron");
const puppeteer = require("puppeteer");
// // const shell = require("electron").shell;
// const Store = require("electron-store");
// const fs = require("fs");

// store = new Store();

let toggleCancel = true;

async function parsing(page) {
  console.log("parsing start");
  let description = await page.evaluate(() => {
    let auctionTitle = document.querySelector(
      "#container > div.contents_wrap > div > div.state_wrap > div > div > div:nth-child(1) > ul > li:nth-child(1)"
    );
    auctionTitle =
      auctionTitle == null
        ? document.querySelector(
            "#container > div.contents_wrap > div > div.state_wrap > div > div > div:nth-child(1)"
          ).innerText
        : auctionTitle.innerText;
    let number = document.querySelector(
      "#container > div.contents_wrap > div > div.master_detail > div > div.right > div.author > div.lot.detail_lot > div:nth-child(1) > strong"
    )?.innerText;
    let artistKr = document.querySelector("#artist_name > span")?.innerText;
    return {
      number,
      artistKr,
      auctionTitle,
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
  const arrAuction = getArrAuction();
  const arrClosedAuction = [];
  const arrOpenedAuction = [];
  const res = [];
  if (!arrAuction) return false;

  //ready for browser
  const browser = await configureBrowser();
  const page = await browser.newPage();
  //access the website
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // close the modal
  await page.waitForSelector("#closebtn", { timeout: 9000 });
  const button_closeModal = await page.$("#closebtn");
  if (button_closeModal != null) button_closeModal.click();
  await page.waitForTimeout(3000);

  //DEPTH 1 : auction
  while (toggleCancel) {
    //access the nav
    await page.hover(".fl_menu > li");
    await page.waitForTimeout(5000);
    // select the auction
    console.log(arrAuction[0]);
    let selector_auction;
    if (arrAuction[0] == "major") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(1) > ul > li:nth-child(1) > span";
    } else if (arrAuction[0] == "online") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(1) > span";
    } else if (arrAuction[0] == "artsy") {
      selector_auction = "#outsideIngBtn > span";
    } else if (arrAuction[0] == "zero") {
      selector_auction = "#zerobaseBtn > span";
    } else {
      console.error(
        "웹사이트의 구조가 바뀌었거나 선택하여 불러오려고 하는 옥션의 설정값이 시스템에 저장되어 있지 않습니다."
      );
      break;
    }
    console.log(selector_auction);
    await page.waitForSelector(selector_auction, { timeout: 9000 });

    const button_auction = await page.$(selector_auction + "> a");
    console.log(button_auction);
    if (button_auction == null) {
      console.log(
        `선택자(${selector_auction + "> a"})가 페이지상에 존재하지 않습니다`
      );
      console.log(`${arrAuction[0]}경매는 아직 열리지 않았습니다.`);
      arrClosedAuction.push(arrAuction[0]);
    } else {
      arrOpenedAuction.push(arrAuction[0]);
      button_auction.click();

      // DEPTH 2 : pagination
      let pageIndex = 2;
      while (toggleCancel) {
        console.log(pageIndex - 2);
        await page.waitForTimeout(1000);
        await page.waitForSelector("div.left .page_ul", { timeout: 9000 });
        const arrPagination = await page.$$("div.left .page_ul > li");
        if (pageIndex == arrPagination.length - 2) break;
        console.log(arrPagination);
        console.log(arrPagination[pageIndex]);
        arrPagination[pageIndex].click();
        // DEPTH 3 : artwork
        let artworkIndex = 0;
        while (toggleCancel) {
          await page.waitForTimeout(1000);
          await page.waitForSelector("#auctionList > li", { timeout: 9000 });
          const arrArtwork = await page.$$("#auctionList > li");
          //check if artwork exists
          if (artworkIndex == arrArtwork.length) break;
          //access to new artwork page
          console.log(arrArtwork);
          console.log(arrArtwork[artworkIndex]);
          arrArtwork[artworkIndex].click();
          // parsing
          await page.waitForTimeout(1000);
          let description = await parsing(page);
          console.log(description);
          res.push(description);
          //displaying
          await display_table([description]);
          // go again
          await page.goBack();
          console.log("artwork " + (artworkIndex + 1) + " has completed.");
          artworkIndex++;
        }
        console.log("artwork " + (pageIndex - 1) + " has completed.");
        pageIndex++;
      }
      console.log(`${arrAuction[0]}를 마쳤습니다.`);
    }
    arrAuction.shift();
    if (arrAuction.length == 0) break;
  }
  // All Loops are Over
  await browser.close();
  console.log("Browser has closed.");
  console.log(`${arrOpenedAuction}경매가 열려있습니다.`);
  console.log(`${arrClosedAuction}경매가 열려 있지 않습니다.`);
  return res;
}
function onSubmit(el) {
  if (el.classList.contains("disabled")) return false;

  let url = "https://www.seoulauction.com/";
  scraper(url).then((res) => {
    console.log(res);
  });
  // .catch((error) => {
  //   console.error(error);
  //   openModal(error);
  // });
}
