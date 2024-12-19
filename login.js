document.addEventListener("DOMContentLoaded", () => {
	chrome.runtime.sendMessage({ action: "isToken" }, res => {
		console.log(res);
		if (res.status) window.location.href = "popup.html";
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
