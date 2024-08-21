/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { marked } from 'https://cdn.jsdelivr.net/npm/marked@13.0.3/lib/marked.esm.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.es.mjs';

(async () => {
  const errorMessage = document.getElementById('error-message');
  const promptArea = document.getElementById('prompt-area');
  const problematicArea = document.getElementById('problematic-area');
  const promptInput = document.getElementById('prompt-input');
  const responseArea = document.getElementById('response-area');
  const copyLinkButton = document.getElementById('copy-link-button');
  const resetButton = document.getElementById('reset-button');
  const copyHelper = document.querySelector('small');
  const rawResponse = document.querySelector('details div');
  const form = document.querySelector('form');
  const maxTokensInfo = document.getElementById('max-tokens');
  const temperatureInfo = document.getElementById('temperature');
  const tokensLeftInfo = document.getElementById('tokens-left');
  const tokensSoFarInfo = document.getElementById('tokens-so-far');
  const topKInfo = document.getElementById('top-k');

  responseArea.style.display = 'none';

  let session = null;

  if (!window.ai && !window.ai.assistant) {
    errorMessage.style.display = 'block';
    errorMessage.innerHTML = `Your browser doesn't support the Prompt API. If you're on Chrome, join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`;
    return;
  }

  promptArea.style.display = 'block';
  copyLinkButton.style.display = 'none';
  copyHelper.style.display = 'none';

  const promptModel = async (highlight = false) => {
    copyLinkButton.style.display = 'none';
    copyHelper.style.display = 'none';
    problematicArea.style.display = 'none';
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    responseArea.style.display = 'block';
    const heading = document.createElement('h3');
    heading.textContent = prompt;
    responseArea.append(heading);
    const p = document.createElement('p');
    p.classList.add('answer');
    p.textContent = 'Generating response...';
    responseArea.append(p);
    let fullResponse = '';

    try {
      console.log('session', session)
      if (!session) {
        session = await window.ai.assistant.create();
        updateStats();
      }
      const stream = await session.promptStreaming(prompt);

      for await (const chunk of stream) {
        fullResponse = chunk.trim();
        p.innerHTML = DOMPurify.sanitize(marked.parse(fullResponse));
        rawResponse.innerText = fullResponse;
      }
    } catch (error) {
      p.textContent = `Error: ${error.message}`;
    } finally {
      if (highlight) {
        problematicArea.style.display = 'block';
        problematicArea.querySelector('#problem').innerText =
          decodeURIComponent(highlight).trim();
      }
      copyLinkButton.style.display = 'inline-block';
      copyHelper.style.display = 'inline';
      updateStats();
    }
  };

  const updateStats = () => {
    const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } = session;
    maxTokensInfo.textContent = new Intl.NumberFormat('en-US', ).format(maxTokens);
    temperatureInfo.textContent = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 5 }).format(
      temperature,
    ),
    tokensLeftInfo.textContent = new Intl.NumberFormat('en-US', ).format(tokensLeft);
    tokensSoFarInfo.textContent = new Intl.NumberFormat('en-US', ).format(tokensSoFar);
    topKInfo.textContent = new Intl.NumberFormat('en-US', ).format(topK); ;
  };

  const params = new URLSearchParams(location.search);
  const urlPrompt = params.get('prompt');
  const highlight = params.get('highlight');
  if (urlPrompt) {
    promptInput.value = decodeURIComponent(urlPrompt).trim();
    await promptModel(highlight);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await promptModel();
  });

  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  promptInput.addEventListener('focus', () => {
    promptInput.select();
  });

  resetButton.addEventListener('click', () => {
    promptInput.value = '';
    responseArea.style.display = 'none';
    responseArea.innerHTML = '';
    rawResponse.innerHTML = '';
    problematicArea.style.display = 'none';
    copyLinkButton.style.display = 'none';
    copyHelper.style.display = 'none';
    maxTokensInfo.textContent = 'N/A';
    temperatureInfo.textContent = 'N/A';
    tokensLeftInfo.textContent = 'N/A';
    tokensSoFarInfo.textContent = 'N/A';
    topKInfo.textContent = 'N/A';
    promptInput.focus();
    session.destroy();
    session = null;
  });

  copyLinkButton.addEventListener('click', () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    const url = new URL(window.location.href);
    url.searchParams.set('prompt', encodeURIComponent(prompt));
    const selection = getSelection().toString() || '';
    if (selection) {
      url.searchParams.set('highlight', encodeURIComponent(selection));
    } else {
      url.searchParams.delete('highlight');
    }
    navigator.clipboard.writeText(url.toString()).catch((err) => {
      alert('Failed to copy link: ', err);
    });
    const text = copyLinkButton.textContent;
    copyLinkButton.textContent = 'Copied';
    setTimeout(() => {
      copyLinkButton.textContent = text;
    }, 3000);
  });
})();
