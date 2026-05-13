import { createApp } from "./app.js";
import { connectMongo, disconnectMongo } from "./db.js";
import { env } from "./config/env.js";

async function main() {
  await connectMongo();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`Listening on ${env.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    console.info(`${signal} received, shutting down`);

    server.close(async (closeErr) => {
      if (closeErr) {
        console.error(closeErr);
        process.exit(1);
      }
      try {
        await disconnectMongo();
        process.exit(0);
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
    });

    const forceMs = 10_000;
    setTimeout(() => {
      console.error(`Forced shutdown after ${forceMs}ms`);
      process.exit(1);
    }, forceMs).unref();
  };

  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
