const { ipcRenderer } = require("electron");
const puppeteer = require("puppeteer");
// // const shell = require("electron").shell;
// const Store = require("electron-store");
// const fs = require("fs");

// store = new Store();

let toggleCancel = true;

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
    alert("적어도 하나는 선택해야 합니다.");
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

  //DEPTH 1 : auction
  while (toggleCancel) {
    //access the nav
    await page.waitForTimeout(3000);
    await page.hover(".fl_menu > li");
    await page.waitForTimeout(3000);
    // select the auction
    console.log(arrAuction[0]);
    let selector_auction;
    if (arrAuction[0] == "major") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(1) > ul > li:nth-child(1) > span > a";
    } else if (arrAuction[0] == "online") {
      selector_auction =
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(1) > span > a";
    } else if (arrAuction[0] == "artsy") {
      selector_auction = "#outsideIngBtn > span";
    } else if (arrAuction[0] == "zero") {
      selector_auction = "#zerobaseBtn > span";
    } else {
      alert(
        "선택하여 불러오려고 하는 옥션의 설정값이 시스템에 저장되어 있지 않습니다."
      );
    }
    console.log(selector_auction);
    await page.waitForSelector(selector_auction, { timeout: 9000 });
    const button_auction = await page.$(selector_auction);
    console.log(button_auction);
    if (button_auction == null) {
      alert(`선택자(${selector_auction})가 페이지상에 존재하지 않습니다`);
      arrClosedAuction.push(arrAuction[0]);
      break;
    }
    button_auction.click();

    // console.log(button_auction);
    // if (button_auction == null) {
    //   alert("경매가 열리지 않았습니다.");
    //   arrClosedAuction.push(arrAuction[0]);
    // }
    // button_auction.click();

    // DEPTH 2 : pagination
    await page.waitForSelector("div.left .page_ul", { timeout: 9000 });
    const arrPagination = await page.$$("div.left .page_ul > li");
    console.log(arrPagination);
    let i = 3;
    while (toggleCancel) {
      if (i > arrPagination.length - 2) break;
      console.log(i - 2);
      arrPagination[i].click();
      await page.waitForTimeout(3000);
      await page.waitForSelector("div.left .page_ul", { timeout: 9000 });
      i++;
    }

    // let button_active = document.querySelector(
    //   "div.left li.ng-scope.page_active"
    // );
    // let button_nextPagination = await page.$eval(
    //   "div.left li.ng-scope.page_active",
    //   (el) => {
    //     if (el.nextElementSibling.getAttribute("title") == "Next Page") {
    //       return false;
    //     } else {
    //       return el.nextElementSibling;
    //     }
    //   }
    // );
    // //check if paginate button is disabled
    // console.log("button_nextPagination", button_nextPagination);
    // if (button_nextPagination) {
    //   button_nextPagination.click();
    // } else {
    //   console.log("다음 버튼이 Next Button버튼이기에 pagination 종료.");
    //   break;
    // }

    // DEPTH 3 : artwork
    arrAuction.shift();
    if (arrAuction.length == 0) break;
  }
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
