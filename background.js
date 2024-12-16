chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = message.tabId;
    if (message.action === "storeChat") {
        chrome.storage.session.set({ [tabId]: message.chatData }, () => {
            console.log(`Chat data dynamically stored for Tab ID: ${tabId}`);
        });
    } else if (message.action === "getChat") {
        chrome.storage.session.get(tabId, (result) => {
            sendResponse(result[tabId]);
        });
        return true;
    }

});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(tabId.toString(), () => {
        console.log(`Session data cleared for Tab ID: ${tabId}`);
    });
});
