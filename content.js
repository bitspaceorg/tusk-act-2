// Extract and log the text content of the page
const pageContent = document.body.innerText;

console.log(pageContent);

// Send the content to the extension's background or popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "getPageContent") {
		sendResponse({ content: pageContent });
	}
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getHTML") {
    // Extract the full HTML content of the page
    console.log(pageContent)
    sendResponse({ html: document.documentElement.outerHTML });
  }
});
