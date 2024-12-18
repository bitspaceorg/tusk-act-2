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

function loadChats() {
	getTabId((tabId) => {
		chrome.runtime.sendMessage({ action: "getChat", tabId }, res => {
			chatDataRepo = res || []; buildChats();
		});
	})
}

function storeChats(type, message) {
	chatDataRepo = [...chatDataRepo, { type, message }];
	getTabId((tabId) => {
		chrome.runtime.sendMessage({ action: "storeChat", chatDataRepo, tabId }, _ => {
			buildChats();
		})
	})
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

document.addEventListener("DOMContentLoaded", () => {
	chrome.runtime.sendMessage({ action: "getUser" }, res => {
		console.log(res);
		if (res.status) {
			userData = res.data;
			loadChats();
			buildUser();
		}
	});
});
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
    if (messagesDiv) {
      const messageDiv = document.createElement("div");
      if (isWhitelistModeOn && isNotWhitelisted) {
        messageDiv.textContent = "Not Accessible (Whitelist Mode)";
      } else if (isBlacklisted) {
        messageDiv.textContent = "Not Accessible (Blacklisted)";
      } else {
        messageDiv.textContent = `Tab URL: ${tab.url}`;
      }
      messagesDiv.appendChild(messageDiv);
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
