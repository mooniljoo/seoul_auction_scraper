let source = document.querySelector("title")?.innerText;
let auctionTitle = document.querySelector(".auc-top-title")?.innerText;
let number = document.querySelector(".goods-info > h2")?.innerText;
let artist = document.querySelector(".goods-info > .artist")?.innerText;
let title = document.querySelector(".goods-info > .product")?.innerText;
let sizeEdition = document.querySelector(
  ".goods-info > .product-info > dd:nth-child(1)"
)?.innerText;
let material = document.querySelector(
  ".goods-info > .product-info > dd:nth-child(2)"
)?.innerText;
let year = document.querySelector(
  ".goods-info > .product-info > dd:nth-child(3)"
)?.innerText;
let currentPrice = document.querySelector(
  ".goods-value> p:nth-child(2) > strong"
)?.innerText;
let estPrice = document
  .querySelector(".goods-value> p:nth-child(3) > strong")
  ?.innerText.replace(/\s/g, "");
let estimateMin = estPrice?.split("-")[0];
let estimateMax = estPrice?.split("-")[1];

let artistKr = artist?.replace(/[^ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, "").trim();
let artistEn = artist?.replace(/[^a-zA-z\s]/g, "").trim();

let titleKr = title?.replace(/[a-zA-z\s]/g, "").trim();
let titleEn = title?.replace(/[^a-zA-z\s]/g, "").trim();

let materialKr = material?.replace(/[a-zA-z\s]/g, "").trim();
let materialEn = material?.replace(/[^a-zA-z\s]/g, "").trim();

let certi = "";
let signPosition = "";
let transactDate = "";
let winningBidUnit = "";
let winningBid = "";
let estimateUnit = "";

q = {
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
  source,
  auctionTitle,
  transactDate,
  winningBidUnit,
  winningBid,
  estimateUnit,
  estimateMin,
  estimateMax,
};
q;
