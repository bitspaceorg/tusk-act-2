function getTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        callback(tabId);
    });
}

function loadStoredChats() {
    getTabId((tabId) => {
        chrome.storage.session.get([String(tabId)], (data) => {
            const messages = data[String(tabId)] || [];
            const messagesDiv = document.getElementById("response");

            messagesDiv.innerHTML = "";

            messages.forEach(({ type, message }) => {
                const messageDiv = document.createElement("div");
                messageDiv.textContent = message;
                messageDiv.classList.add(type === "user" ? "user-chat" : "bot-chat");
                messagesDiv.appendChild(messageDiv);
            });

            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
    });
}

function saveMessageToStorage(type, message) {
    getTabId((tabId) => {
        chrome.storage.session.get([String(tabId)], (data) => {
            const chats = data[String(tabId)] || [];
            chats.push({ type, message });
            chrome.storage.session.set({ [String(tabId)]: chats });
        });
    });
}
document.getElementById("send-button").addEventListener("click", () => {
    const userInput = document.getElementById("user-input").value.trim();
    const messagesDiv = document.getElementById("response");

    if (userInput) {
        const userMessage = document.createElement("div");
        userMessage.textContent = `${userInput}`;
        userMessage.classList.add("user-chat");
        messagesDiv.appendChild(userMessage);

        saveMessageToStorage("user", userInput);

        const inputBar = document.getElementById("user-input");
        inputBar.disabled = true;

        const typingDiv = document.createElement("div");
        typingDiv.classList.add("typing");
        typingDiv.classList.add("bot-chat");
        typingDiv.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        messagesDiv.appendChild(typingDiv);

        setTimeout(() => {
            messagesDiv.removeChild(typingDiv);

            const botMessage = document.createElement("div");
            const botText = "This route allows you to upload documents that you want to validate for compliance. Unlike the knowledge base upload, these documents are not regulations but rather documents that need to be checked against the knowledge base for compliance.";
            botMessage.textContent = botText;
            botMessage.classList.add("bot-chat");
            messagesDiv.appendChild(botMessage);

            saveMessageToStorage("bot", botText);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            inputBar.disabled = false;
            inputBar.focus();
        }, 2000);

        document.getElementById("user-input").value = "";
    }
});

document.getElementById("user-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const userInput = document.getElementById("user-input").value.trim();
        const messagesDiv = document.getElementById("response");

        if (userInput) {
            const userMessage = document.createElement("div");
            userMessage.textContent = `${userInput}`;
            userMessage.classList.add("user-chat");
            messagesDiv.appendChild(userMessage);

            saveMessageToStorage("user", userInput);

            const inputBar = document.getElementById("user-input");
            inputBar.disabled = true;

            const typingDiv = document.createElement("div");
            typingDiv.classList.add("typing");
            typingDiv.classList.add("bot-chat");
            typingDiv.innerHTML = `
                <span></span>
                <span></span>
                <span></span>
            `;
            messagesDiv.appendChild(typingDiv);

            setTimeout(() => {
                messagesDiv.removeChild(typingDiv);

            const botMessage = document.createElement("div");
            const botText = "This route allows you to upload documents that you want to validate for compliance. Unlike the knowledge base upload, these documents are not regulations but rather documents that need to be checked against the knowledge base for compliance.";
            botMessage.textContent = botText;
            botMessage.classList.add("bot-chat");
            messagesDiv.appendChild(botMessage);

            saveMessageToStorage("bot", botText);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                inputBar.disabled = false;
                inputBar.focus();
            }, 2000);

            inputBar.value = "";
        }
    }
});


//document.getElementById('sendHTML').addEventListener('click', async () => {
//  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//
//  chrome.scripting.executeScript(
//    {
//      target: { tabId: tab.id },
//      func: () => document.documentElement.outerHTML
//    },
//    async (results) => {
//      const htmlContent = results;
//
//      const response = await fetch("http://127.0.0.1:5000/upload-html", {
//        method: "POST",
//        headers: {
//          "Content-Type": "application/json"
//        },
//        body: JSON.stringify({ html: htmlContent })
//      });
//
//      const result = await response.json();
//      alert(result.message);
//    }
//  );
//});
document.addEventListener("DOMContentLoaded", loadStoredChats);

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(String(tabId));
});
