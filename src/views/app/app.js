// const { ipcRenderer } = require("electron");
// const puppeteer = require("puppeteer");
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
function onSubmit(el) {
  const arrAuction = getArrAuction();
  const arrClosedAuction = [];

  if (el.classList.contains("disabled")) return false;
  if (!arrAuction) return false;

  //DEPTH 1 : auction
  while (toggleCancel) {
    console.log(arrAuction[0]);
    let button_auction;
    if (arrAuction[0] == "major") {
      button_auction = document.querySelector(
        "#gnbMenuConatiner >div >ul> li:nth-child(1) > ul > li:nth-child(1) > span > a"
      );
    } else if (arrAuction[0] == "online") {
      button_auction = document.querySelector(
        "#gnbMenuConatiner >div >ul> li:nth-child(2) > ul > li:nth-child(1) > span > a"
      );
    } else if (arrAuction[0] == "artsy") {
      button_auction = document.querySelector("#outsideIngBtn > span");
    } else if (arrAuction[0] == "zero") {
      button_auction = document.querySelector("#zerobaseBtn > span");
    } else {
      alert("불러올 옥션을 선택할 때 문제가   발생했습니다.");
    }

    console.log(button_auction);
    if (button_auction == null) {
      alert("경매가 열리지 않았습니다.");
      arrClosedAuction.push(arrAuction[0]);
    }
    // button_auction.click();

    // DEPTH 2 : pagination
    button_active = document.querySelector("div.left li.ng-scope.page_active");
    let bool_isNextButtonDisabled = await page.$eval(
      "div.left li.ng-scope.page_active",
      (el) => {
        if (el.nextElementSibling.getAttribute("title") == "Next Page") {
          return false;
        } else {
          return true;
        }
      }
    );
    //check if paginate button is disabled
    console.log("bool_isNextButtonDisabled", bool_isNextButtonDisabled);
    if (bool_isNextButtonDisabled) break;

    // DEPTH 3 : artwork
    arrAuction.shift();
    if (arrAuction.length == 0) break;
  }
}
