chrome.runtime.onInstalled.addListener(() => {
	console.log("Extension installed");
});

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
	const tabId = message.tabId;

	switch (message.action) {
		case "storeChat":
			chrome.storage.session.set({ [tabId]: message.chatDataRepo }, () => {
				sendResponse({ status: true, message: "Message successfully stored!" });
			});
			break;
		case "getChat":
			chrome.storage.session.get(tabId.toString(), (result) => {
				sendResponse(result[tabId]);
			});
			break;
	}

	return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
	chrome.storage.session.remove(tabId.toString(), () => {
		console.log(`Session data cleared for Tab ID: ${tabId}`);
	});
});
