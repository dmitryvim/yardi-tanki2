/**
 * Load Next.js standalone config from build output.
 * Must be imported BEFORE "next" to set __NEXT_PRIVATE_STANDALONE_CONFIG.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

if (process.env.NODE_ENV === "production") {
  try {
    const serverFiles = JSON.parse(
      readFileSync(join(process.cwd(), ".next", "required-server-files.json"), "utf-8")
    );
    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(serverFiles.config);
  } catch {
    // Non-standalone build — next() will auto-detect config
  }
}
