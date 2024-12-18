document.getElementById('sendHTML').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML
    },
    async (results) => {
      const htmlContent = results;
      console.log(htmlContent)
      const response = await fetch("http://127.0.0.1:6969/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ html: htmlContent[0]["result"] })
      });

      const result = await response.json();
      alert(result.message);
    }
  );
});

//document.getElementById("sendHTML").addEventListener("click", async () => {
//  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//
//  // Send a message to the content script to get the HTML
//  chrome.tabs.sendMessage(
//    tab.id,
//    { action: "getHTML" },
//    async (response) => {
//      console.log("options" , response)
//      if (response && response.html) {
//        const htmlContent = response.html;
//
//        // Send the HTML content to your server
//        const res = await fetch("http://127.0.0.1:6969/parse", {
//          method: "POST",
//          headers: {
//            "Content-Type": "application/json",
//          },
//          body: JSON.stringify({ html: htmlContent }),
//        });
//
//        const result = await res.json();
//        alert(result.message);
//      } else {
//        alert("Failed to retrieve HTML content");
//      }
//    }
//  );
//});

document.addEventListener('DOMContentLoaded', () => {
    const whitelistInput = document.getElementById('whitelistInput');
    const addWhitelistBtn = document.getElementById('addWhitelist');
    const whitelistContainer = document.getElementById('whitelistItemContainer');
    const whitelistModeToggle = document.getElementById('whitelistModeToggle');

    const blacklistInput = document.getElementById('blacklistInput');
    const addBlacklistBtn = document.getElementById('addBlacklist');
    const blacklistContainer = document.getElementById('blacklistItemContainer');

    // Sidebar Button Event Listeners
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const contentSections = document.querySelectorAll('.content-section');

    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and content sections
            sidebarButtons.forEach(btn => btn.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Show corresponding content section
            const targetId = button.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Helper function to create list item with remove functionality
    function createListItem(website, isWhitelist = true) {
        const listItem = document.createElement('div');
        listItem.classList.add('list-item');
        listItem.innerHTML = `
            <span>${website}</span>
            <button class="remove-btn">Remove</button>
        `;

        // Remove item when remove button is clicked
        listItem.querySelector('.remove-btn').addEventListener('click', () => {
            const action = isWhitelist ? 'removeFromWhitelist' : 'removeFromBlacklist';
            chrome.runtime.sendMessage({ 
                action: action, 
                website: website 
            }, () => {
                listItem.remove();
            });
        });

        return listItem;
    }

    // Load lists from storage
    function loadStoredLists() {
        // Clear existing lists
        whitelistContainer.innerHTML = '';
        blacklistContainer.innerHTML = '';

        // Fetch and populate whitelist
        chrome.runtime.sendMessage({ action: 'getWhitelist' }, (response) => {
            console.log(response)
            if (response && response.whitelist) {
                response.whitelist.forEach(website => {
                    const listItem = createListItem(website, true);
                    whitelistContainer.appendChild(listItem);
                });
            }
        });

        // Fetch and populate blacklist
        chrome.runtime.sendMessage({ action: 'getBlacklist' }, (response) => {
            if (response && response.blacklist) {
                response.blacklist.forEach(website => {
                    const listItem = createListItem(website, false);
                    blacklistContainer.appendChild(listItem);
                });
            }
        });

        // Fetch whitelist mode status
        chrome.runtime.sendMessage({ action: 'getWhitelistMode' }, (response) => {
            if (response && response.isWhitelistModeOn !== undefined) {
                whitelistModeToggle.checked = response.isWhitelistModeOn;
            }
        });
    }

    // Whitelist Mode Toggle
    whitelistModeToggle.addEventListener('change', () => {
        const isWhitelistModeOn = whitelistModeToggle.checked;

        // Send message to background script to store whitelist mode status
        chrome.runtime.sendMessage({
            action: 'storeWhitelistMode',
            isWhitelistModeOn: isWhitelistModeOn
        });
    });

    // Whitelist Management
    addWhitelistBtn.addEventListener('click', () => {
        const website = whitelistInput.value.trim();
        if (website) {
            console.log(website)
            chrome.runtime.sendMessage({
                action: 'addToWhitelist',
                website: website
            }, () => {
                const listItem = createListItem(website, true);
                whitelistContainer.appendChild(listItem);
                whitelistInput.value = ''; // Clear input
            });
        }
    });

    // Blacklist Management
    addBlacklistBtn.addEventListener('click', () => {
        const website = blacklistInput.value.trim();
        if (website) {
            chrome.runtime.sendMessage({
                action: 'addToBlacklist',
                website: website
            }, () => {
                const listItem = createListItem(website, false);
                blacklistContainer.appendChild(listItem);
                blacklistInput.value = ''; // Clear input
            });
        }
    });

    // Load stored lists when the page loads
    loadStoredLists();
});
