/* 
 * This code is part of Lett Proxy Tab chrome extension
 * 
 */
'use strict';

chrome.runtime.sendMessage({
	kind:'MainFrameRedirect',
	data: {
		url: new URL(location).searchParams.get('url')
	}
});