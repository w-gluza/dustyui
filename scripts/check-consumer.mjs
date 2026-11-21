import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = join(root, "consumer");
const work = join(tmpdir(), "dustyui-consumer");
const SKIPPED = new Set(["node_modules", ".next", "tsconfig.tsbuildinfo"]);
const results = [];

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(`${result.stdout}\n${result.stderr}\n`);
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function record(scenario, passed, detail = "") {
  results.push({ scenario, passed, detail });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`The consumer app did not start at ${url}`);
}

function measure(page) {
  return page.evaluate(() => {
    const park = document.querySelector('[role="tree"][aria-label="Park"]');
    const rows = document.querySelector('[role="tree"][aria-label="Rows"]');
    const button = document.querySelector("button");
    const avatar = document.querySelector('[role="img"]');
    const indent = (level) => {
      const row = park?.querySelector(`[aria-level="${level}"]`);
      return row ? parseFloat(getComputedStyle(row).paddingInlineStart) : -1;
    };
    return {
      surfaceToken: getComputedStyle(document.documentElement)
        .getPropertyValue("--dusty-surface")
        .trim(),
      monoToken: getComputedStyle(
        document.querySelector("#mono") ?? document.documentElement,
      )
        .getPropertyValue("--dusty-surface")
        .trim(),
      buttonRadius: button ? getComputedStyle(button).borderRadius : "",
      buttonBackground: button ? getComputedStyle(button).backgroundColor : "",
      avatarWidth: avatar
        ? Math.round(avatar.getBoundingClientRect().width)
        : -1,
      parkRows: park?.querySelectorAll('[role="treeitem"]').length ?? 0,
      indentLevel1: indent(1),
      indentLevel3: indent(3),
      largeRows: rows?.querySelectorAll('[role="treeitem"]').length ?? 0,
      largeScrollHeight: rows?.scrollHeight ?? 0,
      largeClientHeight: rows?.clientHeight ?? 0,
    };
  });
}

function recordStyles(prefix, measured) {
  record(
    `${prefix}: theme tokens and component styles load`,
    measured.surfaceToken !== "" &&
      measured.buttonRadius !== "0px" &&
      measured.buttonBackground !== "rgba(0, 0, 0, 0)",
    `--dusty-surface ${measured.surfaceToken || "missing"}, button radius ${measured.buttonRadius}`,
  );
}

function recordTree(prefix, measured) {
  record(
    `${prefix}: nested rows are indented`,
    measured.indentLevel3 > measured.indentLevel1,
    `level 1 ${measured.indentLevel1}px, level 3 ${measured.indentLevel3}px`,
  );
  record(
    `${prefix}: a 5,000-item list with every range open draws few rows and keeps its full height`,
    measured.largeRows > 5 &&
      measured.largeRows < 100 &&
      measured.largeScrollHeight > 5000 * 10 &&
      measured.largeClientHeight <= 300,
    `${measured.largeRows} rows drawn, scroll height ${measured.largeScrollHeight}px`,
  );
}

function watchPolicy(context) {
  return context.addInitScript(() => {
    window.blockedByPolicy = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.blockedByPolicy.push(event.effectiveDirective);
    });
  });
}

function getBlocked(page) {
  return page.evaluate(() => [...new Set(window.blockedByPolicy)]);
}

async function checkPages(origin, policy) {
  const browser = await chromium.launch();
  try {
    const response = await fetch(origin);
    const html = await response.text();
    record(
      "the policy that forbids inline styles is the one being served",
      response.headers.get("content-security-policy") === policy,
      response.headers.get("content-security-policy") ?? "no header",
    );
    record(
      "server page: tree rows are in the HTML before any script runs",
      html.includes('role="treeitem"') && html.includes("Torres del Paine"),
    );

    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noScript.newPage();
    await staticPage.goto(origin);
    const withoutScript = await measure(staticPage);
    recordStyles("server page without script", withoutScript);
    record(
      "known limit - server page without script: indentation is blocked by the policy",
      withoutScript.indentLevel3 === withoutScript.indentLevel1,
      `level 1 ${withoutScript.indentLevel1}px, level 3 ${withoutScript.indentLevel3}px`,
    );
    await noScript.close();

    const context = await browser.newContext();
    await watchPolicy(context);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin);
    await page.getByRole("searchbox").fill("puma");
    await page.getByText("1 match").waitFor();
    const hydrated = await measure(page);
    recordStyles("server page after hydration", hydrated);
    record(
      "server page: a theme imported by its own path applies",
      hydrated.monoToken !== "" && hydrated.monoToken !== hydrated.surfaceToken,
      `mono --dusty-surface ${hydrated.monoToken || "missing"}`,
    );
    recordTree("server page after hydration", hydrated);
    record(
      "server page: a named avatar size applies, with and without script",
      hydrated.avatarWidth === 32 && withoutScript.avatarWidth === 32,
      `asked for 32px, got ${withoutScript.avatarWidth}px then ${hydrated.avatarWidth}px`,
    );
    await page.keyboard.press("Enter");
    await page.getByText("1 of 1").waitFor();
    const selected = await page
      .locator('[role="treeitem"][aria-selected="true"]')
      .textContent();
    record(
      "server page after hydration: search finds and selects a match",
      selected === 'commonName: "Puma"',
      selected ?? "nothing selected",
    );
    const path = await page
      .getByRole("region", { name: "Selected value in Park" })
      .textContent();
    record(
      "server page after hydration: details show the selected path",
      path?.includes("$.animals[1].commonName") === true,
    );

    const blockedOnServerPage = await getBlocked(page);
    record(
      "known limit - server page: the policy blocks inline style attributes and nothing else",
      blockedOnServerPage.join() === "style-src-attr",
      blockedOnServerPage.join(", ") || "nothing blocked",
    );

    const clientPage = await context.newPage();
    clientPage.on("pageerror", (error) => errors.push(error.message));
    await clientPage.goto(`${origin}/client`);
    await clientPage.getByRole("button", { name: "Mount" }).click();
    await clientPage
      .locator('[role="tree"][aria-label="Rows"] [role="treeitem"]')
      .first()
      .waitFor();
    await clientPage.getByRole("searchbox").fill("puma");
    await clientPage.getByText("1 match").waitFor();
    await clientPage.getByRole("searchbox").press("Enter");
    await clientPage.getByRole("button", { name: "Copy path" }).click();
    const mounted = await measure(clientPage);
    const blockedOnClientPage = await getBlocked(clientPage);
    recordStyles("client page", mounted);
    recordTree("client page, mounted after load", mounted);
    record(
      "client page, mounted after load: an avatar size given as a number applies",
      mounted.avatarWidth === 32,
      `asked for 32px, got ${mounted.avatarWidth}px`,
    );
    record(
      "client page: nothing is blocked by the policy",
      blockedOnClientPage.length === 0,
      blockedOnClientPage.join(", "),
    );
    record("no page threw an error", errors.length === 0, errors[0] ?? "");
    await context.close();
  } finally {
    await browser.close();
  }
}

async function main() {
  const packDir = join(work, "pack");
  const app = join(work, "app");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(packDir, { recursive: true });
  mkdirSync(app, { recursive: true });
  run("npm", ["pack", "--pack-destination", packDir], root);
  const tarball = readdirSync(packDir).find((name) => name.endsWith(".tgz"));
  if (!tarball) {
    throw new Error("npm pack produced no tarball");
  }
  const listing = run("tar", ["-tzf", join(packDir, tarball)], root);
  record(
    "the package holds the built files, the licence and no tests",
    listing.includes("package/dist/index.js") &&
      listing.includes("package/dist/index.d.ts") &&
      listing.includes("package/LICENSE") &&
      /\.css\n/u.test(listing) &&
      !/\.test\.|\/test\//u.test(listing),
    `${listing.trim().split("\n").length} files`,
  );

  for (const name of readdirSync(fixture)) {
    if (!SKIPPED.has(name)) {
      cpSync(join(fixture, name), join(app, name), { recursive: true });
    }
  }
  for (const name of ["tsconfig.json", "tsconfig.types.json"]) {
    const settings = JSON.parse(readFileSync(join(app, name), "utf8"));
    delete settings.compilerOptions.paths;
    writeFileSync(join(app, name), JSON.stringify(settings, null, 2));
  }
  run("npm", ["ci", "--no-audit", "--no-fund"], app);
  run(
    "npm",
    ["install", "--no-audit", "--no-fund", "--no-save", join(packDir, tarball)],
    app,
  );
  record(
    "the packed library installs into a fresh Next.js app",
    existsSync(join(app, "node_modules", "dustyui", "dist", "index.js")),
  );

  run("npx", ["tsc", "-p", "tsconfig.types.json"], app);
  record(
    "the published types pass for a consumer that also checks libraries",
    true,
  );

  run("npx", ["next", "build"], app);
  record("the app type-checks and builds against the package", true);

  const { CONTENT_SECURITY_POLICY } = await import(
    join(fixture, "next.config.mjs")
  );
  const port = await getFreePort();
  const server = spawn("npx", ["next", "start", "-p", String(port)], {
    cwd: app,
    stdio: "ignore",
  });
  try {
    const origin = `http://localhost:${port}`;
    await waitForServer(origin);
    await checkPages(origin, CONTENT_SECURITY_POLICY);
  } finally {
    server.kill();
  }

  process.stdout.write(`\nPolicy: ${CONTENT_SECURITY_POLICY}\n\n`);
  for (const { scenario, passed, detail } of results) {
    process.stdout.write(
      `${passed ? "pass" : "FAIL"}  ${scenario}${detail ? `  (${detail})` : ""}\n`,
    );
  }
  const failed = results.filter((result) => !result.passed);
  process.stdout.write(
    `\n${results.length - failed.length} of ${results.length} scenarios passed\n`,
  );
  process.exitCode = failed.length === 0 ? 0 : 1;
}

await main();
