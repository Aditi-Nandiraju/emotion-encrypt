# Mini Emotion Cipher

Built for the UnsaidTalks **Emotion-Aware Encryption Hackathon**.

> Feelings stay readable, words stay private.

## What it does

1. You type a message.
2. The app detects the emotion(s) in it (e.g. *Joy + Anxiety*) directly from the plaintext.
3. It then encrypts the message with real **AES-256-GCM** encryption — the text becomes unreadable ciphertext.
4. The detected emotion tag is shown **alongside the ciphertext**, so anyone (or any AI) looking at the encrypted state can still see how the sender feels, without ever seeing what they actually said.
5. Click **Decrypt** to reverse the encryption with the generated key and recover the exact original message — the emotion is re-detected from the recovered text to prove the signal wasn't just cached.

## Why this satisfies the brief

The problem statement asks for two things at once:

- **Privacy** — the actual text stays secure through encryption
- **Empathy** — the emotional meaning is still detectable while encrypted

A cryptographic hash or AES ciphertext is intentionally designed to look like pure noise (the "avalanche effect") — there is no real emotional signal left inside the ciphertext bytes themselves for an AI to read. Any project claiming to detect emotion *from inside* a real hash is either not using a real hash, or is secretly leaking the label through a side channel.

So this project does the architecturally honest version of "emotion survives encryption":

- Emotion is detected from the plaintext **before** encryption happens.
- The emotion tag is attached as metadata that travels **next to** the ciphertext, not inside it.
- The ciphertext itself stays completely opaque and unreadable until decrypted with the correct key.

This is the same approach implied by the hackathon's own sample input/output examples, where the "Encrypted Output" block shows both the ciphertext *and* the detected emotion side by side.

## How the pieces work

### Emotion detection — `emotion.js`
A real pretrained transformer model — **`j-hartmann/emotion-english-distilroberta-base`** (DistilRoBERTa fine-tuned on emotion-labeled text, 7 classes: anger, disgust, fear, joy, neutral, sadness, surprise) — running entirely in the browser via [transformers.js](https://github.com/xenova/transformers.js), which executes the model on-device with WebAssembly. The model weights are fetched once from the Hugging Face CDN on first use and cached by the browser afterward.

No API key, no server-side inference call, and no per-request cost. Every emotion within 65% of the top confidence score is kept, which is what allows genuine multi-label output (e.g. `Joy + Surprise`) instead of forcing a single label.

### Encryption — `app.js`
Uses the browser's native **Web Crypto API** (`crypto.subtle`), not a custom or toy cipher:

- `AES-256-GCM` — a real, audited, authenticated encryption mode
- A fresh random 256-bit key is generated for every message (shown on screen for this demo so you can copy it and decrypt later)
- A fresh random 12-byte IV (nonce) is generated per message — required for AES-GCM security, prevents identical messages from producing identical ciphertext
- Decryption requires the exact key + IV; tampering with either causes `crypto.subtle.decrypt` to throw, which the UI reports as a decryption failure

### No backend
Everything — detection, encryption, decryption — runs entirely client-side in the browser. There is no server, no database, no API key, and no user data ever leaves the page. This also means the app can be hosted for free on any static host (Vercel, Netlify, GitHub Pages) with zero ongoing cost or credit usage.

## Running locally

No build step or dependencies required.

```
git clone <this-repo>
cd emotion-cipher
```

Then just open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari). Web Crypto API is supported in all of them.

## Deploying

Drag-and-drop the folder onto [Netlify Drop](https://app.netlify.com/drop), or:

```
npm i -g vercel
vercel
```

No environment variables or build configuration needed — it's static HTML/CSS/JS.

## Live demo

- Hosted app: *[add your deployed link here]*
- Demo video: *[add your Loom/Google Drive link here]*

## Tech stack

- HTML / CSS / vanilla JavaScript
- Web Crypto API (AES-256-GCM)
- Lexicon-based emotion classification

## Limitations & honest notes

- The model first runs on first use, it downloads ~80MB of weights from the Hugging Face CDN, so the very first encrypt click can take a few seconds (subsequent clicks are instant since the browser caches the model). This requires an internet connection on first load; it is not offline like a keyword-based approach would be.
- The encryption key is shown on screen for demo transparency. In a production version, the key would be supplied by the user or derived from a password (e.g. via PBKDF2) rather than auto-generated and displayed.
