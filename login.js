document.addEventListener("DOMContentLoaded", () => {
	chrome.runtime.sendMessage({ action: "getUser" }, res => {
		if (res.data) window.location.href = "popup.html";
	});
});

document.getElementById("sign-in").addEventListener("click", () => {
	chrome.runtime.sendMessage({ action: "auth" }, res => {
		if (res.status) {
			window.location.href = "popup.html";
		}
		else console.error(res.message);
	})
})
