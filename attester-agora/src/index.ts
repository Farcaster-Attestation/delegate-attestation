import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { main } from "./main";

const INTERVAL = 60 * 1000;

main()
  .then(() => {})
  .catch(console.error);
setInterval(() => {
  main()
    .then(() => {})
    .catch(console.error);
}, INTERVAL);

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
