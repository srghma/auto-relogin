// Function to click the LOGIN button (executed in the context of the login page)
function clickLoginButton() {
  const loginButton = document.querySelector("button[type='submit'], input[type='submit']");
  if (loginButton) {
    console.log("Clicking login button...");
    loginButton.click();
  } else {
    console.log("Login button not found!");
  }
}

const closeTabAfter = 4000
const checkInterval = 2 * 1000 // Check every 5 minutes
const urlToReenableInternet = "http://ratanaplaza.hotspot/login"
//const urlToReenableInternet = "http://rathanamall.com.kh/login"
// const urlToReenableInternet = "http://soryahotspot.com/login"

// Debounce function
function debounce(func, wait) {
  let running = false;
  return async function (...args) {
    if (running) return;
    running = true;
    const output = await func.apply(this, args);
    await new Promise((resolve) => setTimeout(resolve, wait));
    running = false;
    return output
  };
}

// Function to open the login URL in a new tab
async function relogin() {
  const tab = await chrome.tabs.create({ url: urlToReenableInternet, active: false });
  console.log("I've created a tab");

  // Inject script to click login button
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: clickLoginButton
    });
  } catch (error) {
    console.error("Failed to inject script:", error);
  }

  // Optional: Add logic to close the tab after a delay, if needed
  await new Promise((resolve) => setTimeout(resolve, closeTabAfter));

  try {
    console.log(`Removing tab ${tab.id}`);
    chrome.tabs.remove(tab.id);
  } catch (error) {
    console.error(`ERROR ON Removing tab ${tab.id}`);
    console.error(error);
  }
}

// Function to check internet connectivity
async function isInternetWorking() {
  try {
    const response = await fetch("https://8.8.8.8", { mode: "no-cors" });
    if (response.ok || response.type === "opaque") {
      return true;
    }
  } catch (error) {
  }
  return false;
}

// Debounced versions
const relogin_debounced = debounce(relogin, 1000);

// Run the function immediately when the service worker is activated
self.addEventListener("activate", relogin_debounced)

// Set up alarms
chrome.alarms.create("reloginAlarm", { periodInMinutes: 6 });
chrome.alarms.create("connectivityCheckAlarm", { periodInMinutes: 0.1 });

// Listen for alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`got alarm ${alarm.name}`);
  if (alarm.name === "reloginAlarm") {
    await relogin_debounced();
  } else if (alarm.name === "connectivityCheckAlarm") {
    if (!navigator.onLine) {
      console.log("Wifi is disabled by user, no need to relogin");
      return;
    }
    if (!await isInternetWorking()) {
      console.log("Network is offline, attempting re-login...");
      await relogin_debounced();
    }
  } else {
    throw new Error(`Unknown alarm: ${alarm.name}`);
  }
});
