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
