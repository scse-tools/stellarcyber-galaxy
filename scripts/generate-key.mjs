#!/usr/bin/env node
import { randomBytes } from "node:crypto";

const key = randomBytes(32).toString("base64");
process.stdout.write(`GALAXY_ENCRYPTION_KEY=${key}\n`);
