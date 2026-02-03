/**
 * チュートリアル9章: キャッシュAPIの検証
 */
import { createApp, kt } from "../../src/index";

const script = () => {
	kt.title("キャッシュAPIテスト");
	kt.divider();

	// === cache_data ===
	kt.header("cache_data");

	// 基本使用
	const _fetchUsers = kt.cache_data((limit: number) => {
		console.log(`Fetching users with limit ${limit}...`);
		return [
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
		].slice(0, limit);
	});

	// TTL付き
	const _fetchWeather = kt.cache_data(
		(city: string) => {
			console.log(`Fetching weather for ${city}...`);
			return { city, temp: 25 };
		},
		{ ttl: 3600 },
	);

	// max_entries付き
	const _searchProducts = kt.cache_data(
		(query: string) => {
			console.log(`Searching products: ${query}...`);
			return [{ name: query }];
		},
		{ max_entries: 50 },
	);

	kt.write("cache_data 関数を定義しました");

	// === cache_resource ===
	kt.header("cache_resource");

	let connectionCount = 0;
	const getDb = kt.cache_resource(() => {
		connectionCount++;
		console.log(`Creating new DB connection #${connectionCount}...`);
		return { id: connectionCount, query: (_sql: string) => [] };
	});

	const db1 = getDb();
	const db2 = getDb();
	kt.write(`DB connection same instance: ${db1 === db2}`);
	kt.write(`Connection count: ${connectionCount}`);

	// === キャッシュのクリア ===
	kt.header("キャッシュのクリア");

	if (kt.button("cache_data をクリア", { key: "clear_cache_data" })) {
		kt.cache_data.clear();
		kt.success("cache_data をクリアしました");
	}

	if (kt.button("cache_resource をクリア", { key: "clear_cache_resource" })) {
		kt.cache_resource.clear();
		kt.success("cache_resource をクリアしました");
	}

	if (kt.button("全キャッシュをクリア", { key: "clear_all" })) {
		kt.clear_all_caches();
		kt.success("全キャッシュをクリアしました");
	}

	kt.divider();
	kt.write("キャッシュAPIテスト完了");

	return undefined;
};

const app = await createApp(script, { port: 3106 });
console.log("Cache API test: App created successfully");

const server = Bun.serve({
	port: 3106,
	fetch: app.fetch,
	websocket: app.websocket,
});
console.log(`Server started at http://localhost:${server.port}`);

setTimeout(() => {
	server.stop();
	console.log("Server stopped");
	process.exit(0);
}, 1000);
