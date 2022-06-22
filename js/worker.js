/* 
 * This code is part of Lett Proxy Tab chrome extension
 * 
 */
'use strict';

class std
{
	static define(x, initVal)
	{
		return x == null ? initVal : x;
	}
}

class array
{
	static cast(x)
	{
		return x instanceof Array ? x : [x];
	}
}

class string
{
	static format(str, args)
	{
		args = array.cast(args);

		return str.replace(/%s/g, _ => args.shift());
	}
}

class math
{
	static rand(len)
	{
		let n = Math.random().toString().slice(2, len + 2);

		if (n[0] == '0' || n.length != len) {
			return this.rand(len);
		}

		return +n;
	}
}

class ext
{
	static url(filename)
	{
		return chrome.runtime.getURL(
			string.format('html/%s.html', filename)
		);
	}
}

class PendingPromise extends Promise
{
	constructor(resolve)
	{
		super(e => resolve = e);

		Object.defineProperties(this, {
			constructor: {
				value:Promise
			},
			resolve: {
				value:resolve
			}
		});
	}
}

class Storage
{
	constructor()
	{
		this.cache = {};

		this.local = chrome.storage.local;
	}

	get(key, initVal = {})
	{
		const item = this.prepare(key, initVal);

		return this.local.get(item).then(
			r => this.setCache(key, r[key])
		);
	}

	set(key, val)
	{
		const data = this.prepare(key, val);

		for (const k in data)
		{
			this.setCache(k, data[k]);
		}

		return this.setLocal(data);
	}

	remove(key)
	{
		delete this.cache[key];

		return this.local.remove(key);
	}

	setLocal(key, val)
	{
		return this.local.set(
			this.prepare(key, val)
		);
	}

	getCache(key)
	{
		if (key in this.cache)
		{
			return this.cache[key];
		}

		return this.get(key);
	}

	setCache(key, val)
	{
		return this.cache[key] = this.persist(val, key);
	}

	didChange(key)
	{
		this.setLocal(key, this.cache[key]);
	}

	persist(obj, rootKey)
	{
		if (obj && typeof obj == 'object')
		{
			for (const k in obj)
			{
				obj[k] = this.persist(obj[k], rootKey);
			}

			return this.proxy(obj, rootKey, this);
		}

		return obj;
	}

	proxy(obj, rootKey, self)
	{
		return new Proxy(obj,
		{
			set(a, b, c)
			{
				if (c && typeof c == 'object')
				{
					c = self.proxy(c, rootKey, self);
				}

				a[b] = c;

				self.didChange(rootKey);

				return true;
			}
		});
	}

	prepare(key, val = null)
	{
		if (typeof key != 'object')
		{
			return {[key]:val};
		}

		return key;
	}
}

class AppStorage extends Storage
{
	load()
	{
		const didLoad = new PendingPromise;

		this.local.get(null).then(r =>
		{
			const curVer = chrome.runtime.getManifest().version;
			const oldVer = r.ver;

			if (curVer != oldVer)
			{
				if (!oldVer)
				{
					r = {
						sessions:{}, ver:curVer
					}
				}

				this.setLocal(r);
			}

			for (const k in r)
			{
				this.setCache(k, r[k]);
			}

			didLoad.resolve(true);
		});

		return didLoad;
	}

	newSession(tabId)
	{
		return this.cache.sessions[tabId] = math.rand(12);
	}

	activeTabs()
	{
		return Object.keys(this.cache.sessions).map(tabId => +tabId);
	}
}

const app = new Proxy(new AppStorage,
{
	get(a, b)
	{
		if (b in a) {
			return a[b].bind(a);
		}

		return a.getCache(b);
	},

	set(a, b, c)
	{
		a.set(b, c);
	}
});

class Ruleset
{
	static proxyUrl = 'https://secure.lett.app';

	static count = 6;

	static create(tabId, sessId, URL)
	{
		const [baseUrl, safeUrl] = [URL.origin, this.proxyUrl];

		const rules = [
		{
			condition: {
				tabIds:[tabId],
				regexFilter:'.*',
				resourceTypes:['main_frame']
			},
			action: {
				type:'redirect',
				redirect: {
					regexSubstitution:string.format('%s?url=\\0', ext.url('redirect'))
				}
			}
		},
		{
			condition: {
				tabIds:[tabId],
				regexFilter:'.*',
				excludedResourceTypes:['main_frame']
			},
			action: {
				type:'redirect',
				redirect: {
					regexSubstitution:string.format('%s/fetch/\\0', safeUrl)
				}
			}
		},
		{
			condition: {
				tabIds:[tabId],
				regexFilter:string.format('^%s/(.*)', baseUrl),
				excludedResourceTypes:['ping']
			},
			action: {
				type:'redirect',
				redirect: {
					regexSubstitution:string.format('%s/\\1', safeUrl)
				}
			}
		},
		{
			condition: {
				tabIds:[tabId],
				regexFilter:string.format('^%s/', safeUrl),
				excludedResourceTypes:['ping']
			},
			action: {
				type:'allow'
			}
		},
		{
			condition: {
				tabIds:[tabId],
				resourceTypes:['ping']
			},
			action: {
				type:'block'
			}
		},
		{
			condition: {
				tabIds:[tabId],
				excludedResourceTypes:['ping']
			},
			action: {
				type:'modifyHeaders',
				requestHeaders: [{
					header:'cookie',
					operation:'remove'
				},
				{
					header:'base-url',
					operation:'set',
					value:baseUrl
				},
				{
					header:'sess-id',
					operation:'set',
					value:sessId.toString()
				}]
			}
		}];

		for (let i = 0; i < rules.length; i++)
		{
			let p = i + 1;

			rules[i].id = this.ruleId(tabId, p);
			rules[i].priority = p;
		}

		return rules;
	}

	static ruleIds(tabId)
	{
		return Array(this.count).fill().map(
			(x, i) => this.ruleId(tabId, i + 1)
		);
	}

	static safeUrl(URL)
	{
		return URL.href.replace(URL.origin, this.proxyUrl);
	}

	static ruleId(tabId, p)
	{
		return tabId + (1e4 * p);
	}
}

class Main
{
	constructor()
	{
		this.ready = app.load();

		chrome.runtime.onInstalled.addListener(
			this.onload.bind(this, 'onInstalled')
		);

		chrome.runtime.onMessage.addListener(
			this.onload.bind(this, 'onMessage')
		);

		chrome.contextMenus.onClicked.addListener(
			this.onload.bind(this, 'onContextMenuClicked')
		);

		chrome.extension.isAllowedIncognitoAccess(
			bool => this.isAllowedIncognito = bool
		);
	}

	onload(event, ...args)
	{
		this.ready.then(
			_ => this[event].apply(this, args)
		);

		return true;
	}

	onContextMenuClicked(e)
	{
		this.cleanupSessions();
		this.startNewSession(e.linkUrl);
	}

	startNewSession(url)
	{
		const URL = this.validateUrl(url);

		if (!URL) {
			return;
		}

		const p = {
			type:'popup', url:'about:blank'
		};

		chrome.windows.create(p).then(win =>
		{
			const tabId = win.tabs[0].id;
			const sessId = app.newSession(tabId);

			this.createSessionRules(tabId, sessId, URL);
		});
	}

	cleanupSessions()
	{
		const tabIds = app.activeTabs();

		for (const tabId of tabIds)
		{
			chrome.tabs.get(tabId).catch(
				_ => this.removeSessionRules(tabId, true)
			);
		}
	}

	createSessionRules(tabId, sessId, URL)
	{
		const addRules = Ruleset.create(tabId, sessId, URL);

		chrome.declarativeNetRequest.updateSessionRules({addRules}).then(
			_ => this.safeRedirect(tabId, URL)
		);
	}

	updateSessionRules(tabId, URL)
	{
		const sessId = app.sessions[tabId];

		this.removeSessionRules(tabId);
		this.createSessionRules(tabId, sessId, URL);
	}

	removeSessionRules(tabId, tabRemoved)
	{
		if (tabRemoved) {
			delete app.sessions[tabId];
		}

		chrome.declarativeNetRequest.updateSessionRules({
			removeRuleIds: Ruleset.ruleIds(tabId)
		});
	}

	safeRedirect(tabId, URL)
	{
		chrome.tabs.update(tabId, {
			url: Ruleset.safeUrl(URL)
		});
	}

	onInstalled()
	{
		chrome.contextMenus.create({
			id:'ProxyTab',
			title:'Open with Proxy Tab',
			contexts:['link']
		});
	}

	validateUrl(url)
	{
		try {
			url = new URL(url);
		}
		catch (e) {
			return;
		}

		return url.origin.startsWith('http') && url;
	}

	onMessage(message, sender, callback)
	{
		this[message.kind]?.call(
			this, message.data, sender.tab, callback
		);
	}

	MainFrameRedirect(data, tab)
	{
		const URL = this.validateUrl(data.url);

		if (URL) {
			this.updateSessionRules(tab.id, URL);
		}
	}
}

new Main;