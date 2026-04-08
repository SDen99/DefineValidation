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
		client: {start:"_app/immutable/entry/start.Cax3-EaH.js",app:"_app/immutable/entry/app.CZXuDCV9.js",imports:["_app/immutable/entry/start.Cax3-EaH.js","_app/immutable/chunks/5dSSb2gw.js","_app/immutable/entry/app.CZXuDCV9.js","_app/immutable/chunks/5dSSb2gw.js"],stylesheets:["_app/immutable/assets/vendor.BpcL6yKj.css","_app/immutable/assets/vendor.BpcL6yKj.css"],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-DqGsnJOl.js')),
			__memo(() => import('./chunks/1-Bi2p2FeM.js')),
			__memo(() => import('./chunks/2-CGQpbxgV.js')),
			__memo(() => import('./chunks/3-PG6B5nZG.js')),
			__memo(() => import('./chunks/4-DU0Ad4-X.js')),
			__memo(() => import('./chunks/5-B1Krg7uv.js')),
			__memo(() => import('./chunks/6-ic5i71gn.js')),
			__memo(() => import('./chunks/7-C-mrbcvo.js')),
			__memo(() => import('./chunks/8-DV2H9gMT.js')),
			__memo(() => import('./chunks/9-NTNBTqo_.js')),
			__memo(() => import('./chunks/10-JScirNsE.js')),
			__memo(() => import('./chunks/11-DfXLbsTR.js'))
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
