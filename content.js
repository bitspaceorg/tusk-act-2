const pageContent = document.body.innerText;

chrome.runtime.sendMessage({ action: "isToken" }, res => {
	if (!res.status) {
		window.href.location = 'login.html';
	}
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "getPageContent") {
		sendResponse({ content: pageContent });
	}
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "getHTML") {
		sendResponse({ html: document.documentElement.outerHTML });
	}
});
