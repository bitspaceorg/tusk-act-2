// Extract and log the text content of the page
const pageContent = document.body.innerText;

// Send the content to the extension's background or popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getPageContent") {
        sendResponse({ content: pageContent });
    }
});
