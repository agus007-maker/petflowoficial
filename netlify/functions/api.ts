import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import serverless from "serverless-http";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";
import { registerStorageProxy } from "../../server/_core/storageProxy";
import { handleAppointmentReminders } from "../../server/scheduledReminders";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
app.post("/scheduled/appointment-reminders", handleAppointmentReminders);
app.use(createExpressMiddleware({ router: appRouter, createContext }));

export const handler = serverless(app);
