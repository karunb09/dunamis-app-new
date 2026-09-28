const detectDevice = () => {
  const ua = navigator.userAgent || "";
  // iPadOS reports itself as a Mac; the touch screen gives it away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const os = ios
    ? "ios"
    : /Android/.test(ua)
      ? "android"
      : /Macintosh/.test(ua)
        ? "mac"
        : /Windows/.test(ua)
          ? "windows"
          : "other";
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? "Microsoft Edge"
    : /Firefox\/|FxiOS/.test(ua)
      ? "Firefox"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Chrome\/|CriOS/.test(ua)
          ? "Google Chrome"
          : "Safari";
  return { os, browser };
};

// Where the device itself allows or blocks location for the browser. A site set
// to "Allow" still gets "permission denied" when this is off.
const deviceSteps = ({ os, browser }) => {
  if (os === "mac") {
    return `open System Settings → Privacy & Security → Location Services, turn it on, and switch on ${browser} in the list`;
  }
  if (os === "ios") {
    const entry = browser === "Safari" ? "Safari Websites" : browser;
    return `open Settings → Privacy & Security → Location Services, turn it on, then tap ${entry} and choose "While Using the App"`;
  }
  if (os === "android") {
    return `turn on Location in your phone's quick settings, then in Settings → Apps → ${browser} → Permissions → Location, choose Allow`;
  }
  if (os === "windows") {
    return 'open Settings → Privacy & security → Location, and turn on "Location services" and "Let desktop apps access your location"';
  }
  return `turn on Location Services for ${browser} in your device settings`;
};

// Where the browser allows or blocks location for this one site.
const siteSteps = ({ os, browser }) => {
  if (browser === "Safari" && os === "mac") {
    return "in Safari, open Settings → Websites → Location and set this site to Allow";
  }
  if (os === "ios") {
    return "tap aA in the address bar → Website Settings → Location → Allow";
  }
  const press = os === "android" ? "tap" : "click";
  if (browser === "Firefox") {
    return `${press} the icon left of the address bar and clear the blocked Location permission`;
  }
  return `${press} the icon left of the address bar → Permissions (or Site settings) → Location → Allow`;
};

const sentence = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// null where the Permissions API can't answer (older Safari).
const sitePermission = async () => {
  try {
    return (await navigator.permissions?.query({ name: "geolocation" }))?.state || null;
  } catch {
    return null;
  }
};

const deniedMessage = async () => {
  const device = detectDevice();
  const state = await sitePermission();
  if (state === "granted") {
    return `This site is allowed to use your location, but your device is blocking ${device.browser}. ${sentence(deviceSteps(device))}, then try again.`;
  }
  if (state === "denied") {
    return `Location is blocked for this site. ${sentence(siteSteps(device))}, then reload the page.`;
  }
  return `Location is blocked. ${sentence(siteSteps(device))}. If it already says Allow, ${deviceSteps(device)}.`;
};

const MESSAGES = {
  2: "Your device couldn't work out where you are. Turn on location (GPS or Wi-Fi) and try again.",
  3: "Finding your location took too long. Step near a window or outside and try again.",
};

// A fresh, high-accuracy reading. maximumAge 0 so a fix cached from before the
// instructor arrived can never be the one submitted.
export const getCurrentFix = () =>
  new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(Object.assign(new Error("This browser can't share your location."), { code: 0 }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: Math.max(1, Math.round(position.coords.accuracy)),
          deviceTime: position.timestamp,
        }),
      async (err) => {
        const message =
          err.code === 1
            ? await deniedMessage()
            : MESSAGES[err.code] || "Couldn't read your location.";
        reject(Object.assign(new Error(message), { code: err.code }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
