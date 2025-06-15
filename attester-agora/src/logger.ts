import { createLogger, format } from "winston";
import { transports } from "winston";

export const logger = createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: format.simple(),
  // You can also comment out the line above and uncomment the line below for JSON format
  // format: format.json(),
  transports: [new transports.Console()],
});
