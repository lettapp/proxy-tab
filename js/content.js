/* 
 * This code is part of Lett Proxy Tab chrome extension
 * 
 */
'use strict';

window.addEventListener('beforeunload', cleanup);

window.addEventListener('click', e =>
{
	let href, extr;

	for (const a of e.path)
	{
		if (href = a.getAttribute?.('href'))
		{
			extr = a.target && a.target != '_self';

			if (extr) {
				return e.preventDefault() & (location.href = href);
			}

			break;
		}
	}
});

function cleanup()
{
	clearCookies();

	indexedDB.databases().then(
		list => list.forEach(db => indexedDB.deleteDatabase(db.name))
	);

	localStorage.clear();
}

function clearCookies()
{
	let x = new Date(0).toUTCString();

	document.cookie.split(/;\s*/).forEach(str =>
	{
		let c = str.split('=').shift();

		if (c == str) {
			c = '';
		}

		let h = location.host.split('.');

		do {
			let d = h.join('.');

			document.cookie = `${c}=0;expires=${x};domain=${d}`;
		}
		while (h.shift());
	});
}