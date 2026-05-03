// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				AUTH_PIN?: string;
			};
			cf: CfProperties;
			ctx: ExecutionContext;
		}
		interface Locals {
			isAuthenticated: boolean;
		}
	}
}

export {};
