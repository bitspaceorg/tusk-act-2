document.addEventListener('DOMContentLoaded', () => {
	const whitelistInput = document.getElementById('whitelistInput');
	const addWhitelistBtn = document.getElementById('addWhitelist');
	const whitelistContainer = document.getElementById('whitelistItemContainer');
	const whitelistModeToggle = document.getElementById('whitelistModeToggle');

	const blacklistInput = document.getElementById('blacklistInput');
	const addBlacklistBtn = document.getElementById('addBlacklist');
	const blacklistContainer = document.getElementById('blacklistItemContainer');

	const sidebarButtons = document.querySelectorAll('.sidebar-btn');
	const contentSections = document.querySelectorAll('.content-section');

	sidebarButtons.forEach(button => {
		button.addEventListener('click', () => {
			sidebarButtons.forEach(btn => btn.classList.remove('active'));
			contentSections.forEach(section => section.classList.remove('active'));

			button.classList.add('active');

			const targetId = button.getAttribute('data-target');
			document.getElementById(targetId).classList.add('active');
		});
	});

	function createListItem(website, isWhitelist = true) {
		const listItem = document.createElement('div');
		listItem.classList.add('list-item');
		listItem.innerHTML = `
            <span>${website}</span>
            <button class="remove-btn">Remove</button>
        `;

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

	async function loadStoredLists() {
		try {
			whitelistContainer.innerHTML = '';
			blacklistContainer.innerHTML = '';

			const whitelist = (await getStorage('whitelist')) || [];
			whitelist.forEach(website => {
				const listItem = createListItem(website, true);
				whitelistContainer.appendChild(listItem);
			});

			const blacklist = (await getStorage('blacklist')) || [];
			blacklist.forEach(website => {
				const listItem = createListItem(website, false);
				blacklistContainer.appendChild(listItem);
			});

			const isWhitelistModeOn = await getStorage('isWhitelistModeOn');
			if (isWhitelistModeOn !== undefined) {
				whitelistModeToggle.checked = isWhitelistModeOn;
			}
		} catch (error) {
			console.error("Error loading stored lists:", error);
		}
	}

	async function getStorage(key) {
		return new Promise((resolve, reject) => {
			chrome.storage.local.get(key, (result) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError.message);
				} else {
					resolve(result[key]);
				}
			});
		});
	}

	whitelistModeToggle.addEventListener('change', () => {
		const isWhitelistModeOn = whitelistModeToggle.checked;

		chrome.runtime.sendMessage({
			action: 'storeWhitelistMode',
			isWhitelistModeOn: isWhitelistModeOn
		});
	});

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
				whitelistInput.value = '';
			});
		}
	});

	addBlacklistBtn.addEventListener('click', () => {
		const website = blacklistInput.value.trim();
		if (website) {
			chrome.runtime.sendMessage({
				action: 'addToBlacklist',
				website: website
			}, () => {
				const listItem = createListItem(website, false);
				blacklistContainer.appendChild(listItem);
				blacklistInput.value = '';
			});
		}
	});
	loadStoredLists();
});
