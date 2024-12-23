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
function setLoading(){
  const loader = document.getElementById("spinner");
  loader.style.display = 'flex';
}
function quitLoading(){
  const loader = document.getElementById("spinner");
  loader.style.display = "none";
}
function hideMessages() {
    const messagesDiv = document.getElementById("response");
    const inputDiv = document.getElementById("input-container");

    if (messagesDiv) messagesDiv.style.display = "none";
    if (inputDiv) inputDiv.style.display = "none";
}

function buildChats() {
	const messagesDiv = document.getElementById("response");
	messagesDiv.innerHTML = "";

	//console.log(chatDataRepo);

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
document.getElementById("send-button").addEventListener("click", async () => {
	const userInput = document.getElementById("user-input").value.trim();
	storeChats("user", userInput);

    let route = "";
    let domainString = "";

    const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (tabs.length > 0) {
        const url = new URL(tabs[0].url);
        route = url.pathname;
        domainString = url.hostname;
    }
    const loaderC =  document.getElementById("chat-loader");    
    loaderC.style.display = 'flex';
    loaderC.classList.add('chat-loader');
    document.getElementById("user-input").value = "";
    const sendButton = document.getElementById("send-button");
    sendButton.disabled = true; 

    const Iloader =  document.getElementById("inner-chat-loader");    
    Iloader.style.display = 'flex';

    const response = await fetch("http://20.85.126.101:8080/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: userInput,
        domain : domainString,
      })
    });
    
    loaderC.classList.remove('chat-loader');
    loaderC.style.dispay = 'none';
    Iloader.style.display = 'none';
    sendButton.disabled = 'false';
    const result = await response.json();
    storeChats("bot", result['data']);
});

document.getElementById("user-input").addEventListener("keydown", async (event) => {
  
	if (event.key === "Enter") {
	const userInput = document.getElementById("user-input").value.trim();
	storeChats("user", userInput);

    let route = "";
    let domainString = "";

    const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (tabs.length > 0) {
        const url = new URL(tabs[0].url);
        route = url.pathname;
        domainString = url.hostname;
    }
    const loaderC =  document.getElementById("chat-loader");    
    loaderC.style.display = 'flex';
    loaderC.classList.add('chat-loader');
    document.getElementById("user-input").value = "";
    

    const sendButton = document.getElementById("send-button");
    sendButton.disabled = true; 

    const Iloader =  document.getElementById("inner-chat-loader");    
    Iloader.style.display = 'flex';

    const response = await fetch("http://20.85.126.101:8080/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: userInput,
        domain : domainString,
      })
    });
    
    loaderC.classList.remove('chat-loader');
    loaderC.style.dispay = 'none';
    Iloader.style.display = 'none';

    sendButton.disabled = 'false';
    const result = await response.json();
    storeChats("bot", result['data']);
	}
});


async function ingest_route() {

    let route = "";
    let domain = "";
    setLoading();

    const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (tabs.length > 0) {
        const url = new URL(tabs[0].url);
        route = url.pathname;
        domain = url.hostname;
    }
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	const button = document.getElementById("document-domain-button");

	if (button) {
		button.disabled = true;
		button.style.cursor = "not-allowed";
		button.style.opacity = "0.5"; 
	}

	chrome.scripting.executeScript(
		{
			target: { tabId: tab.id },
			func: () => document.body.outerHTML
		},
		async (results) => {
			const htmlContent = results;
			//console.log("options", htmlContent[0]["result"]);
			
			await fetch("http://20.85.126.101:8080/ingest", {
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

      insert_domain();

			if (button) {
				button.remove();
			}

      const messagesDiv = document.getElementById("response");
      const inputDiv = document.getElementById("input-container");

        if (messagesDiv) {
           messagesDiv.style.display = "flex";
                        // buildChats();
              loadChats();
          }
        if (inputDiv) inputDiv.style.display = "flex";
        quitLoading();
			//window.location.href = 'popup.html';

		}
	);
}

async function insert_domain() {
  
    let route = "";
    let domain = "";
    
    const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (tabs.length > 0) {
        const url = new URL(tabs[0].url);
        route = url.pathname;
        domain = url.hostname;
    }
	await fetch("http://20.85.126.101:8080/insert-route", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			domain,
			route
		})
	});
	//window.location.href = 'popup.html';
}

function document_domain() {

	hideMessages();
  setLoading();

	const container = document.getElementById("button-container");
	if (!container) return;



	if (!document.getElementById("document-domain-button")) {
		const button = document.createElement("button");
		button.id = "document-domain-button"; 
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
  quitLoading();
}

async function checkIngestion() {
    let route = "";
    let domain = "";
  
    hideMessages();
    setLoading();
    const buttonDiv = document.getElementById("document-domain-button");
    if(buttonDiv) buttonDiv.remove();  
    
    const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (tabs.length > 0) {
        const url = new URL(tabs[0].url);
        route = url.pathname;
        domain = url.hostname;
    }

    chrome.runtime.sendMessage({ action: "isToken" }, (res) => {
        if (!res.status) {
            window.location.href = "login.html";
        }
    });

    const fetch_response = await fetch("http://20.85.126.101:8080/fetch-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            domain,
            route,
        }),
    });

    const fetch_result = await fetch_response.json();
    const data = fetch_result["data"];
    //console.log(domain);
    //console.log(route);
    //console.log(data);

    if (!data["domain"]) {
        document_domain();    
        //console.log("Not Avaliable");
        quitLoading();
    } 
    else if (data["domain"] && !data["route"]){
      ingest_route();
      const buttonDiv = document.getElementById("document-domain-button");

        if(buttonDiv) buttonDiv.remove();  
      //quitLoading();
    //console.log("Domain only avaialble");
    } 
    else{
    //console.log("Both Available");
    
        quitLoading();
    const messagesDiv = document.getElementById("response");
    const inputDiv = document.getElementById("input-container");
    const buttonDiv = document.getElementById("document-domain-button");
        if (messagesDiv) {
           messagesDiv.style.display = "flex";
              // buildChats();
              loadChats();
          }
        if (inputDiv) inputDiv.style.display = "flex";
        if(buttonDiv) buttonDiv.remove();  
    } 
    
    chrome.runtime.sendMessage({ action: "getUser" }, (res) => {
        const userData = res.data;
        buildUser(userData);
    });
}
async function checkTabUrl(tab) {
    if (tab && tab.url) {
        chrome.runtime.sendMessage(
            { action: "checkUrl", url: tab.url },
            async (response) => { 
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
                    quitLoading();
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
                    quitLoading();
                } else {
                    if (messagesDiv) {
                        messagesDiv.style.display = "flex";
                        // buildChats();
                        loadChats();
                    }
                    if (inputDiv) inputDiv.style.display = "flex";
                    if (errorDiv) errorDiv.style.display = "none";
                    if (errorDescDiv) errorDescDiv.style.display = "none";

                    await checkIngestion();
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
