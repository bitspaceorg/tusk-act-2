chrome.runtime.onInstalled.addListener(() => {
	console.log("Extension installed");
});
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
async function authenticate() {
	try {
		const redirectURL = chrome.identity.getRedirectURL();
		console.log(redirectURL);
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

		console.log("Authentication successful, token retrieved:", authToken);
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

			console.log(photoResponse);

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
	switch (message.action) {
		case "storeChat":
			chrome.storage.session.set({ [message.tabId]: message.chatDataRepo }, () => {
				sendResponse({ status: true, message: "Message successfully stored!" });
			});
			break;

		case "getChat":
			chrome.storage.session.get(message.tabId.toString(), (result) => {
				sendResponse(result[message.tabId]);
			});
			break;

		case "auth":
			authenticate().then((res) => {
				if (res.status && res.data) {
					getUserInfo(res.data).then(userRes => {
						if (res) {
							chrome.storage.session.set({ "user": userRes }, () => {
								sendResponse({ status: true, message: "User successfully stored!" });
							});
						} else {
							sendResponse({ status: false, message: "Auth failed!" });
						}
					})
				} else {
					sendResponse({ status: false, message: res.message });
				}
			}).catch((err) => {
				sendResponse({ status: false, message: err.message });
			});
			break;

		case "getUser":
			chrome.storage.session.get("user", (result) => {
				sendResponse({ status: true, data: result["user"] });
			});
			break;

		default:
			console.warn("Unknown action:", message.action);
			sendResponse({ status: false, message: "Unknown action" });
			break;
	}

	return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
	chrome.storage.session.remove(tabId.toString(), () => {
		console.log(`Session data cleared for Tab ID: ${tabId}`);
	});
});
