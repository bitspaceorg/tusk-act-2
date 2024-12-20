chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.set({
		whitelist: [],
		blacklist: ["chrome://extensions", "https://medium.com"],
		isWhitelistModeOn: false
	}, () => {
		console.log('Initial storage setup complete');
	});
});

chrome.tabs.onActivated.addListener((activeInfo) => {
	chrome.tabs.get(activeInfo.tabId, (tab) => {
		if (tab.url) {
			chrome.runtime.sendMessage({ action: "updatePanel", url: tab.url });
		}
	});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url) {
		chrome.runtime.sendMessage({ action: "updatePanel", url: changeInfo.url });
	}
});

chrome.sidePanel
	.setPanelBehavior({ openPanelOnActionClick: true })
	.catch((error) => console.error(error));

async function authenticate() {
	try {
		const redirectURL = chrome.identity.getRedirectURL();
		const clientId = 'd06ea59b-4524-4cfb-bb39-ec53fa9581de';
		const authURL =
			`https://login.microsoftonline.com/common/oauth2/v2.0/authorize` +
			`?client_id=${clientId}` +
			`&response_type=token` +
			`&redirect_uri=${encodeURIComponent(redirectURL)}` +
			`&scope=openid%20profile%20email%20User.Read`;

		const responseUrl = await chrome.identity.launchWebAuthFlow({
			url: authURL,
			interactive: true,
		});

		const hash = responseUrl.split('#')[1];
		const params = new URLSearchParams(hash);
		const authToken = params.get('access_token');

		if (!authToken) {
			throw new Error("Failed to retrieve access token");
		}
		return { status: true, data: authToken };
	} catch (error) {
		console.error("Authentication error:", error.message);
		return { status: false, message: error.message };
	}
}

async function getUserInfo(token) {
	try {
		const response = await fetch('https://graph.microsoft.com/v1.0/me', {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		const userData = await response.json();

		try {
			const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (photoResponse.ok) {
				const blob = await photoResponse.blob();
				const photoData = URL.createObjectURL(blob);
				return { ...userData, photo: photoData };
			}
			return { ...userData, photo: "" };
		} catch (photoError) {
			console.log('No profile photo available');
		}
	} catch (error) {
		console.error('Error fetching user info:', error);
	}
}

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
	console.log(message.tabId)
	switch (message.action) {
		case "storeChat":
			chrome.storage.session.set({ [message.tabId]: message.chatData }, () => {
				if (chrome.runtime.lastError) {
					sendResponse({ status: false, message: chrome.runtime.lastError.message });
				} else {
					console.log("Chat data stored successfully");
					sendResponse({ status: true, message: "Chat stored successfully" });
				}
			});
			break;

		case "getChat":
			chrome.storage.session.get(String(message.tabId), (result) => {
				if (chrome.runtime.lastError) {
					sendResponse({ status: false, message: chrome.runtime.lastError.message });
				} else {
					const chatData = result[message.tabId] || [];
					console.log("Retrieved chat data:", chatData);
					sendResponse({ status: true, chatData });
				}
			});
			break;

		case "auth":
			authenticate().then((res) => {
				if (res.status && res.data) {
					chrome.storage.session.set({ "token": res.data }, () => {
						sendResponse({ status: true, message: "Token successfully stored!" });
					});
				} else {
					sendResponse({ status: false, message: res.message });
				}
			}).catch((err) => {
				sendResponse({ status: false, message: err.message });
			});
			break;

		case "isToken":
			chrome.storage.session.get("token", (result) => {
				sendResponse({ status: !!result['token'] });
			})
			break;

		case "getUser":
			chrome.storage.session.get("token", (result) => {
				getUserInfo(result['token']).then(userRes => {
					sendResponse({ status: true, data: userRes, message: "User successfully fetched!" });
				})
			})
			break;

		case 'addToWhitelist':
			chrome.storage.local.get('whitelist', (result) => {
				const whitelist = result.whitelist || [];
				console.log('Current whitelist:', whitelist);
				if (!whitelist.includes(message.website)) {
					whitelist.push(message.website);
					chrome.storage.local.set({ whitelist }, () => {
						console.log('Added to whitelist:', message.website);
						console.log('Updated whitelist:', whitelist);
						sendResponse({ status: true });
					});
				}
			});
			break;

		case 'addToBlacklist':
			chrome.storage.local.get('blacklist', (result) => {
				const blacklist = result.blacklist || [];
				console.log('Current blacklist:', blacklist);
				if (!blacklist.includes(message.website)) {
					blacklist.push(message.website);
					chrome.storage.local.set({ blacklist }, () => {
						console.log('Added to blacklist:', message.website);
						console.log('Updated blacklist:', blacklist);
						sendResponse({ status: true });
					});
				}
			});
			break;

		case 'removeFromWhitelist':
			chrome.storage.local.get('whitelist', (result) => {
				const whitelist = result.whitelist || [];
				console.log('Current whitelist:', whitelist);
				const updatedWhitelist = whitelist.filter(site => site !== message.website);

				chrome.storage.local.set({ whitelist: updatedWhitelist }, () => {
					console.log('Removed from whitelist:', message.website);
					console.log('Updated whitelist:', updatedWhitelist);
					sendResponse({
						status: true,
						whitelist: updatedWhitelist
					});
				});
			});
			break;

		case 'removeFromBlacklist':
			chrome.storage.local.get('blacklist', (result) => {
				const blacklist = result.blacklist || [];
				console.log('Current blacklist:', blacklist);
				const updatedBlacklist = blacklist.filter(site => site !== message.website);

				chrome.storage.local.set({ blacklist: updatedBlacklist }, () => {
					console.log('Removed from blacklist:', message.website);
					console.log('Updated blacklist:', updatedBlacklist);
					sendResponse({
						status: true,
						blacklist: updatedBlacklist
					});
				});
			});
			break;

		case 'getWhitelist':
			chrome.storage.local.get('whitelist', (result) => {
				console.log('Retrieving whitelist:', result.whitelist);
				sendResponse({ whitelist: result.whitelist || [] });
			});
			break;
		case 'getBlacklist':
			chrome.storage.local.get('blacklist', (result) => {
				console.log('Retrieving blacklist:', result.blacklist);
				sendResponse({ blacklist: result.blacklist || [] });
			});
			break;

		case 'storeWhitelistMode':
			chrome.storage.local.set({
				isWhitelistModeOn: message.isWhitelistModeOn
			}, () => {
				console.log('Whitelist mode set to:', message.isWhitelistModeOn);
				sendResponse({ status: true });
			});
			break;
		case "checkUrl":
			const normalizeUrl = (url) => {
				if (url.startsWith("http")) return [url, url.replace("://www.", "://")];
				const httpsUrl = `https://${url}`;
				const wwwUrl = `https://www.${url}`;
				return [httpsUrl, wwwUrl];
			};

			chrome.storage.local.get(
				["blacklist", "whitelist", "isWhitelistModeOn"],
				(result) => {
					const blacklist = result.blacklist || [];
					const whitelist = result.whitelist || [];
					const isWhitelistModeOn = result.isWhitelistModeOn || false;

					const isBlacklisted = blacklist.some((blockedUrl) => {
						const [normalizedBlockedUrl, normalizedWithWww] = normalizeUrl(blockedUrl);

						return (
							message.url === blockedUrl ||
							message.url.startsWith(blockedUrl) ||
							message.url.startsWith(normalizedBlockedUrl) ||
							message.url.startsWith(normalizedWithWww)
						);
					});

					const isNotWhitelisted =
						isWhitelistModeOn &&
						!whitelist.some((allowedUrl) => {
							const [normalizedAllowedUrl, normalizedWithWww] = normalizeUrl(allowedUrl);

							return (
								message.url === allowedUrl ||
								message.url.startsWith(allowedUrl) ||
								message.url.startsWith(normalizedAllowedUrl) ||
								message.url.startsWith(normalizedWithWww)
							);
						});

					sendResponse({
						isBlacklisted,
						isNotWhitelisted,
					});
				}
			);
			return true;
		case 'getWhitelistMode':
			chrome.storage.local.get('isWhitelistModeOn', (result) => {
				console.log('Retrieved whitelist mode:', result.isWhitelistModeOn);
				sendResponse({
					isWhitelistModeOn: result.isWhitelistModeOn || false
				});
			});
			break;

		default:
			console.warn("Unknown action:", message.action);
			sendResponse({ status: false, message: "Unknown action" });
			break;
	}

	return true;
});

