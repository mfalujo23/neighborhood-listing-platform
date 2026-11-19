# Media image and measurement correction

The initial browser check found that default Next image widths were being mapped to a smaller repeated1280px file. That produced inconsistent srcset descriptors and an incorrect browser natural width. The corrected image configuration contains only320,640 and1280 device widths with no extra image sizes. The loader requires an exact inventoried WebP width and rejects unsupported widths. The local framework regression generates exactly three distinct URLs and confirms each filename/query width matches its srcset descriptor. Browser verification after rebuild remains separate.

The metrics selector now recognizes exact-currentSrc `img` and preload `link` entries, excludes MIME `fetch` requests, preserves all matching image requests and identifies the selected request URL/initiator. It returns unavailable values as null. LCP diagnostics include observer status, supported entry types, visibility, hidden state and focus; no value is invented when the browser has not supplied an observation.

The standalone next.config.mjs in this overlay is for the isolated preview. For final release, merge the shared config/mfalujo23-media-image-config.mjs image object with the release agent's security-header configuration. Do not replace that agent's combined configuration with this standalone file.

The original Lab7 snapshot and initial browser records remain unchanged. Initial broken-descriptor results are not final performance evidence. No live provider or human approval is inferred from this correction.
