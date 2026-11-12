import { createAuth } from "@pocket-ledger/auth";
import { createDb } from "@pocket-ledger/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
