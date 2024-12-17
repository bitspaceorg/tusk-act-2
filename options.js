document.getElementById('sendHTML').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML
    },
    async (results) => {
      const htmlContent = results;

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

