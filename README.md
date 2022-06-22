# Proxy Tab
Proxy Tab lets you open insecure web links via secure proxy server. It utilizes the `chrome.declarativeNetRequest` API to redirect HTTP requests initiated in the tab to a secure web server for fetching.

### Key advantages:
* Works on-demand on arbitrary links and without pre-setup.
* Traffic is always encrypted and served through secure connection.
* Browsing is private since the original domain name is not exposed.

[![Chrome Web Store Logo](https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/mPGKYBIR2uCP0ApchDXE.png)][cws]

*Requirements:* Chrome/Chromium-based browser v90 and above (Manifest V3).

[cws]: https://chrome.google.com/webstore/detail/lett-proxy-tab/jmeknnpcdkfcfogljkpbpbbbolecfmkf "Proxy Tab on Chrome Web Store"