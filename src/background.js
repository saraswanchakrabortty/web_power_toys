// Background service worker for Web Power Toys (currently idle)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Power Toys installed');
});