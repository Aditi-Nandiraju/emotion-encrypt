/* app.js
 * Real, reversible AES-256-GCM encryption using the browser's native
 * Web Crypto API. Emotion is detected from the plaintext BEFORE encryption
 * and shown alongside the ciphertext, so the emotional signature survives
 * encryption without the original words ever being exposed.
 *
 * Nothing here is a placeholder: the same key that encrypts is required to
 * decrypt, and decryption mathematically fails (throws) on a wrong key.
 */

const inputEl = document.getElementById("input");
const encryptBtn = document.getElementById("encryptBtn");
const decryptBtn = document.getElementById("decryptBtn");
const clearBtn = document.getElementById("clearBtn");
const resultCard = document.getElementById("resultCard");
const emotionTagsEl = document.getElementById("emotionTags");
const cipherOutputEl = document.getElementById("cipherOutput");
const keyDisplayEl = document.getElementById("keyDisplay");
const decryptedSection = document.getElementById("decryptedSection");
const decryptedOutputEl = document.getElementById("decryptedOutput");
const emotionTagsAfterEl = document.getElementById("emotionTagsAfter");

let currentKey = null;   // CryptoKey
let currentIv = null;    // Uint8Array
let currentCipherBuf = null; // ArrayBuffer
let currentEmotions = [];

function renderTags(container, emotions) {
  container.innerHTML = "";
  emotions.forEach(e => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.style.borderColor = "rgba(244,239,228,0.18)";
    tag.innerHTML = `<span class="swatch" style="background:${e.color}"></span>${e.name}`;
    container.appendChild(tag);
  });
}

function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function generateKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function exportKeyReadable(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufToBase64(raw);
}

async function importKeyFromBase64(b64) {
  const raw = base64ToBuf(b64);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

async function encryptMessage(plaintext) {
  currentKey = await generateKey();
  currentIv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  currentCipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: currentIv },
    currentKey,
    encoded
  );
  return currentCipherBuf;
}

async function decryptMessage() {
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: currentIv },
    currentKey,
    currentCipherBuf
  );
  return new TextDecoder().decode(decryptedBuf);
}

encryptBtn.addEventListener("click", async () => {
  const text = inputEl.value.trim();
  if (!text) {
    inputEl.focus();
    return;
  }

  encryptBtn.disabled = true;
  const originalLabel = encryptBtn.textContent;
  encryptBtn.textContent = "Encrypting…";

  try {
    // 1. Detect emotion from plaintext BEFORE encryption
    currentEmotions = await detectEmotions(text);

    // 2. Encrypt the plaintext — words become unreadable
    await encryptMessage(text);

    // 3. Show ciphertext + emotion tag together (IV prepended so it can be stored/shipped as one blob)
    const ivB64 = bufToBase64(currentIv);
    const cipherB64 = bufToBase64(currentCipherBuf);
    cipherOutputEl.textContent = `${ivB64}.${cipherB64}`;

    const keyB64 = await exportKeyReadable(currentKey);
    keyDisplayEl.textContent = keyB64;

    renderTags(emotionTagsEl, currentEmotions);

    resultCard.classList.add("show");
    decryptedSection.style.display = "none";
    decryptBtn.disabled = false;
  } catch (err) {
    console.error("Encrypt error:", err);
    cipherOutputEl.textContent = `Error: ${err.message || err}`;
    resultCard.classList.add("show");
    decryptBtn.disabled = true;
  } finally {
    encryptBtn.disabled = false;
    encryptBtn.textContent = originalLabel;
  }
});

decryptBtn.addEventListener("click", async () => {
  try {
    const original = await decryptMessage();
    decryptedOutputEl.textContent = original;

    // Re-detect emotion from the recovered plaintext to prove it's the
    // same signal, not a cached label
    const reconfirmed = await detectEmotions(original);
    renderTags(emotionTagsAfterEl, reconfirmed);

    decryptedSection.style.display = "block";
  } catch (err) {
    decryptedOutputEl.textContent = "Decryption failed — key or ciphertext mismatch.";
    decryptedSection.style.display = "block";
  }
});

clearBtn.addEventListener("click", () => {
  inputEl.value = "";
  resultCard.classList.remove("show");
  decryptedSection.style.display = "none";
  currentKey = null;
  currentIv = null;
  currentCipherBuf = null;
  inputEl.focus();
});
