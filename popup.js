function getTabId(callback) {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tabId = tabs[0].id;
		callback(tabId);
	});
}

let chatDataRepo = [];
let userData = null;
let domain = "";
let route = "";

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

function loadChats() {
	getTabId((tabId) => {
		chrome.runtime.sendMessage({ action: "getChat", tabId }, (response) => {
			if (response && response.status) {
				chatDataRepo = response.chatData || [];
				buildChats();
			} else {
				console.error("Failed to load chats:", response.message);
			}
		});
	})
}

function storeChats(type, message) {
	getTabId((tabId) => {
		chatDataRepo = [...chatDataRepo, { type, message }];
		chrome.runtime.sendMessage(
			{ action: "storeChat", tabId, chatData: chatDataRepo },
			(response) => {
				if (response && response.status) {
					buildChats();
				} else {
					console.error("Failed to store chat:", response.message);
				}
			}
		);
	});
}

document.getElementById("send-button").addEventListener("click", async () => {
	const userInput = document.getElementById("user-input").value.trim();
	storeChats("user", userInput);
	const response = await fetch("http://127.0.0.1:6969/chat", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			content: userInput,
			domain,
		})
	});
	const result = await response.json();
	storeChats("bot", result['data']);
	document.getElementById("user-input").value = "";
});

document.getElementById("user-input").addEventListener("keydown", async (event) => {
	if (event.key === "Enter") {
		const userInput = document.getElementById("user-input").value.trim();
		storeChats("user", userInput);
		const response = await fetch("http://127.0.0.1:6969/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				content: userInput,
				domain,
			})
		});
		const result = await response.json();
		storeChats("bot", result['data']);
		document.getElementById("user-input").value = "";
	}
});


async function ingest_route() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	chrome.scripting.executeScript(
		{
			target: { tabId: tab.id },
			func: () => document.body.outerHTML
		},
		async (results) => {
			const htmlContent = results;
			console.log("options", htmlContent[0]["result"])
			await fetch("http://127.0.0.1:6969/ingest", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					content: htmlContent[0]["result"],
					domain,
					route,
				})
			});
			window.location.href = 'popup.html';
		}
	);
}

async function insert_domain() {
	await fetch("http://127.0.0.1:6969/insert-route", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			domain,
			route
		})
	});
	window.location.href = 'popup.html';
}

function document_domain() {
	const container = document.getElementById("button-container");
	if (!container) return;

	document.getElementById("input-container").style.display = 'none';

	const button = document.createElement("button");
	button.textContent = "Document Domain";
	button.style.width = "250px";
	button.style.textAlign = "center";
	button.style.alignItems = "center";
	button.style.borderRadius = "2px";
	button.style.background = "#00487f";
	button.style.color = "#fff";
	button.style.border = "none";
	button.style.padding = "10px";
	button.style.cursor = "pointer";

	button.addEventListener("click", () => {
		ingest_route();
	});

	container.appendChild(button);

}

document.addEventListener("DOMContentLoaded", async () => {

	const tabs = await new Promise((resolve) => {
		chrome.tabs.query({ active: true, currentWindow: true }, resolve);
	});

	if (tabs.length > 0) {
		const url = new URL(tabs[0].url);
		route = url.pathname;
		domain = url.hostname;
	}

	chrome.runtime.sendMessage({ action: "isToken" }, res => {
		if (!res.status) {
			window.href.location = 'login.html';
		}
	})

	const fetch_response = await fetch("http://127.0.0.1:6969/fetch-route", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			domain,
			route
		})
	});

	const fetch_result = await fetch_response.json();
	const data = fetch_result['data'];
	console.log(domain);
	console.log(route);
	console.log(data);

	if (!data['domain']) document_domain();
	else if (data['domain'] && !data['route']) ingest_route();
	else loadChats();

	chrome.runtime.sendMessage({ action: "getUser" }, res => {
		userData = res.data;
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
