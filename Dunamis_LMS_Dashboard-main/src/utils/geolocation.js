const MESSAGES = {
  1: "Location is blocked for this site. Allow location access in your browser settings, then try again.",
  2: "Your phone couldn't work out where you are. Turn on location (GPS) and try again.",
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
      (err) =>
        reject(
          Object.assign(new Error(MESSAGES[err.code] || "Couldn't read your location."), {
            code: err.code,
          })
        ),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
