const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "modelproducts/69d693c153739a52ce0179c4/_app",
	assets: new Set(["defineV21-ADaM.xml","favicon.ico","favicon.png","sample-rule-invalid.yaml","sample-rules.yaml"]),
	mimeTypes: {".xml":"text/xml",".png":"image/png",".yaml":"text/yaml"},
	_: {
		client: {start:"_app/immutable/entry/start.CvVN3Xus.js",app:"_app/immutable/entry/app.xEt1PgDA.js",imports:["_app/immutable/entry/start.CvVN3Xus.js","_app/immutable/chunks/Dl8iD9D8.js","_app/immutable/entry/app.xEt1PgDA.js","_app/immutable/chunks/Dl8iD9D8.js"],stylesheets:["_app/immutable/assets/vendor.BpcL6yKj.css","_app/immutable/assets/vendor.BpcL6yKj.css"],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-ZGhQwuTN.js')),
			__memo(() => import('./chunks/1-DuxrCdD-.js')),
			__memo(() => import('./chunks/2-8YCYArOo.js')),
			__memo(() => import('./chunks/3-mfY6rFyR.js')),
			__memo(() => import('./chunks/4-BZLvqqoU.js')),
			__memo(() => import('./chunks/5-Ce0uzwGl.js')),
			__memo(() => import('./chunks/6-gopaT7Ww.js')),
			__memo(() => import('./chunks/7-CmrvhdT2.js')),
			__memo(() => import('./chunks/8-DwqB0UPN.js')),
			__memo(() => import('./chunks/9-iFw_FzrP.js')),
			__memo(() => import('./chunks/10-BaAEkmwd.js')),
			__memo(() => import('./chunks/11-BERYAv19.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/datasets",
				pattern: /^\/datasets\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/datasets/[id]",
				pattern: /^\/datasets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/dev/test-app-state",
				pattern: /^\/dev\/test-app-state\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/dev/test-data-loading",
				pattern: /^\/dev\/test-data-loading\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/dev/test-enhanced-state",
				pattern: /^\/dev\/test-enhanced-state\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/dev/test-metadata-explorer",
				pattern: /^\/dev\/test-metadata-explorer\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/rules",
				pattern: /^\/rules\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 11 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "/modelproducts/69d693c153739a52ce0179c4";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
