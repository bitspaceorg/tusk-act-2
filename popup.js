function getTabId(callback) {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tabId = tabs[0].id;
		callback(tabId);
	});
}

let chatDataRepo = [];
let userData = null;

function buildUser() {
	const usernameDiv = document.getElementById("username");
	if (userData) {
		//usernameDiv.innerText = userData["displayName"];
	}
}

function buildChats() {
	const messagesDiv = document.getElementById("response");
	messagesDiv.innerHTML = "";

	console.log(chatDataRepo);

	chatDataRepo.forEach(({ type, message }) => {
		const messageDiv = document.createElement("div");
		messageDiv.textContent = message;
		messageDiv.classList.add(type === "user" ? "user-chat" : "bot-chat");
		messagesDiv.appendChild(messageDiv);
	});

	messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

const CHAT_STORAGE_KEY = "sessionChatData";

function loadChats() {
  chrome.runtime.sendMessage({ action: "getChat", key: CHAT_STORAGE_KEY }, (response) => {
    if (response && response.status) {
      chatDataRepo = response.chatData || [];
      buildChats();
    } else {
      console.error("Failed to load chats:", response.message);
    }
  });
}

function storeChats(type, message) {
  chatDataRepo = [...chatDataRepo, { type, message }];
  chrome.runtime.sendMessage(
    { action: "storeChat", key: CHAT_STORAGE_KEY, chatData: chatDataRepo },
    (response) => {
      if (response && response.status) {
        buildChats();
      } else {
        console.error("Failed to store chat:", response.message);
      }
    }
  );
}

document.getElementById("send-button").addEventListener("click", () => {
	const userInput = document.getElementById("user-input").value.trim();
	storeChats("user", userInput);
	storeChats("bot", "hello world!!!");
	document.getElementById("user-input").value = "";
});

document.getElementById("user-input").addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		const userInput = document.getElementById("user-input").value.trim();
		storeChats("user", userInput);
		storeChats("bot", "hello world!!!");
	}
});


//chrome.tabs.onRemoved.addListener((tabId) => {
//	chrome.storage.session.remove(String(tabId));
//});

document.addEventListener("DOMContentLoaded", () => {
	chrome.runtime.sendMessage({ action: "isToken" }, res => {
		if (!res.status) {
			window.href.location = 'login.html';
		}
	})
	chrome.runtime.sendMessage({ action: "getUser" }, res => {
		userData = res.data;
		loadChats();
		buildUser();
	});
});
function checkTabUrl(tab) {
  if (tab && tab.url) {
    chrome.runtime.sendMessage(
      { action: "checkUrl", url: tab.url },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError.message);
          return;
        }

        const messagesDiv = document.getElementById("response");
        const errorDiv = document.getElementById("error");
        const errorDescDiv = document.getElementById("error-desc");
        const inputDiv = document.getElementById("input-container");

        if (response.isNotWhitelisted) {
          if (messagesDiv) messagesDiv.style.display = "none";
          if (inputDiv) inputDiv.style.display = "none";
          if (errorDiv) {
            errorDiv.style.display = "block";
            errorDiv.textContent = "Not Accessible (Whitelist Mode)";
          }
          if (errorDescDiv) {
            errorDescDiv.style.display = "block";
            errorDescDiv.textContent =
              "When Whitelist Mode is enabled, only the websites listed in the whitelist will be accessible. All other websites will be restricted by default.";
          }
        } else if (response.isBlacklisted) {
          if (messagesDiv) messagesDiv.style.display = "none";
          if (inputDiv) inputDiv.style.display = "none";
          if (errorDiv) {
            errorDiv.style.display = "block";
            errorDiv.textContent = "Not Accessible (Blacklisted)";
          }
          if (errorDescDiv) {
            errorDescDiv.style.display = "block";
            errorDescDiv.innerHTML =
              "Websites listed in the blacklist cannot be accessed.<br>Go to options page to change.";
          }
        } else {
          if (messagesDiv) {
            messagesDiv.style.display = "flex";
            buildChats();
          }
          if (inputDiv) inputDiv.style.display = "flex";
          if (errorDiv) errorDiv.style.display = "none";
          if (errorDescDiv) errorDescDiv.style.display = "none";
        }
      }
    );
  }
}
window.onload = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      checkTabUrl(tabs[0]);
    }
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      checkTabUrl(tab);
    });
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id === tabId) {
          checkTabUrl(tab);
        }
      });
    }
  });
};
