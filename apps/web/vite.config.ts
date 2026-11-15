import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the API runs on :3000; same-origin in production (the server serves dist/).
export default defineConfig({
	plugins: [react()],
	server: {
		port: 3001,
		proxy: { "/api": "http://localhost:3000" },
	},
});
