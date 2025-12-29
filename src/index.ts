import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
	return c.text("kantan-ui");
});

export default app;

export { Hono };
