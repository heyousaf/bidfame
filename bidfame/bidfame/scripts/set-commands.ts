// Run once: npm run bot:set-commands
import "dotenv/config";
import { setMyCommands } from "../src/lib/telegram";

setMyCommands()
  .then((r) => console.log("Commands set:", r))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
