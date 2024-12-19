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
    console.log(userData);
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
  chrome.storage.session.get(CHAT_STORAGE_KEY, (result) => {
    chatDataRepo = result[CHAT_STORAGE_KEY] || []; 
    buildChats(); 
  });
}

function storeChats(type, message) {
  chatDataRepo = [...chatDataRepo, { type, message }]; 
  chrome.storage.session.set({ [CHAT_STORAGE_KEY]: chatDataRepo }, () => {
    buildChats();
  });
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
    document.getElementById("user-input").value = "";
	}
});


chrome.tabs.onRemoved.addListener((tabId) => {
	chrome.storage.session.remove(String(tabId));
});
document.addEventListener("DOMContentLoaded", async () => {
  const user = await getUserFromStorage();
  if (user) {
    userData = user; 
  }
  // this is not right ; this will be changed when the auth is fixed
    loadChats(); 
    buildUser();
});

async function getUserFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.session.get("user", (result) => {
      resolve(result["user"]);
    });
  });
}
async function getStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key]);
    });
  });
}

async function checkTabUrl(tab) {
  if (tab && tab.url) {
    const blacklist = (await getStorage("blacklist")) || [];
    const whitelist = (await getStorage("whitelist")) || [];
    const isWhitelistModeOn = await getStorage("isWhitelistModeOn");

    const normalizeUrl = (url) => {
      if (url.startsWith("http")) return [url, url.replace("://www.", "://")];
      const httpsUrl = `https://${url}`;
      const wwwUrl = `https://www.${url}`;
      return [httpsUrl, wwwUrl];
    };

    const isBlacklisted = blacklist.some((blockedUrl) => {
      const [normalizedBlockedUrl, normalizedWithWww] = normalizeUrl(blockedUrl);

      return (
        tab.url === blockedUrl || 
        tab.url.startsWith(blockedUrl) ||
        tab.url.startsWith(normalizedBlockedUrl) ||
        tab.url.startsWith(normalizedWithWww)
      );
    });

    const isNotWhitelisted =
      isWhitelistModeOn &&
      !whitelist.some((allowedUrl) => {
        const [normalizedAllowedUrl, normalizedWithWww] = normalizeUrl(allowedUrl);

        return (
          tab.url === allowedUrl || 
          tab.url.startsWith(allowedUrl) ||
          tab.url.startsWith(normalizedAllowedUrl) ||
          tab.url.startsWith(normalizedWithWww)
        );
      });

    const messagesDiv = document.getElementById("response");
    const errorDiv = document.getElementById("error");
    const errorDescDiv = document.getElementById("error-desc");
    const inputDiv = document.getElementById("input-container")

    if (isWhitelistModeOn && isNotWhitelisted) {
      if (messagesDiv) messagesDiv.style.display = "none";
      if(inputDiv) inputDiv.style.display = "none";
      if (errorDiv) {
        errorDiv.style.display = "block"; 
        errorDiv.textContent = "Not Accessible (Whitelist Mode)";
        errorDescDiv.style.display = "block";
      }
      if (errorDescDiv) {
        errorDescDiv.style.display = "block"; 
        errorDescDiv.textContent =  "When Whitelist Mode is enabled, only the websites listed in the whitelist will be accessible. All other websites will be restricted by default.";
      }
    } else if (isBlacklisted) {
      if (messagesDiv) messagesDiv.style.display = "none";

      if(inputDiv) inputDiv.style.display = "none";
      if (errorDiv) {
        errorDiv.style.display = "block";
        errorDiv.textContent = "Not Accessible (Blacklisted)";
      }
      if (errorDescDiv) {
        errorDescDiv.style.display = "block"; 
        errorDescDiv.innerHTML = "Websites listed in the blacklist cannot be accessed.<br>Go to options page to change.";
      }
    } else {
      if (messagesDiv) {
        if (messagesDiv) messagesDiv.style.display = "flex";
        buildChats();
      }
      if(inputDiv) inputDiv.style.display = "flex";
      if (errorDiv) errorDiv.style.display = "none"; 
      if(errorDescDiv) errorDescDiv.style.display = "none";
    }
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
