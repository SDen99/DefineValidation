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
		client: {start:"_app/immutable/entry/start.B0EyAA8J.js",app:"_app/immutable/entry/app.pohG3JtO.js",imports:["_app/immutable/entry/start.B0EyAA8J.js","_app/immutable/chunks/DwhV2aXb.js","_app/immutable/entry/app.pohG3JtO.js","_app/immutable/chunks/DwhV2aXb.js"],stylesheets:["_app/immutable/assets/vendor.BpcL6yKj.css","_app/immutable/assets/vendor.BpcL6yKj.css"],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-DxnT6xGL.js')),
			__memo(() => import('./chunks/1-BuJ4Q-ty.js')),
			__memo(() => import('./chunks/2-DkX2UfwT.js')),
			__memo(() => import('./chunks/3-BGqwT3fC.js')),
			__memo(() => import('./chunks/4-Ck63g6vn.js')),
			__memo(() => import('./chunks/5-B6CQpVJd.js')),
			__memo(() => import('./chunks/6-DxXJo6KZ.js')),
			__memo(() => import('./chunks/7-Cn0yCdAh.js')),
			__memo(() => import('./chunks/8-CceX1N9k.js')),
			__memo(() => import('./chunks/9-l7Ts3-yo.js')),
			__memo(() => import('./chunks/10-C773UqL0.js')),
			__memo(() => import('./chunks/11-E8FWDGQW.js'))
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
