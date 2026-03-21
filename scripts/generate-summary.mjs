import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const repoRoot = process.cwd();
const outputPath = path.resolve(repoRoot, process.env.OUTPUT_PATH ?? "summary.md");
const publicVaultRepoPath = path.resolve(repoRoot, process.env.PUBLIC_VAULT_PATH ?? "../public-vault");
const privateVaultRepoPath = path.resolve(repoRoot, process.env.PRIVATE_VAULT_PATH ?? "../private-vault");

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const nextPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return walk(nextPath);
      }

      return entry.isFile() && entry.name.endsWith(".md") ? [nextPath] : [];
    }),
  );

  return files.flat();
}

async function resolveVaultRoot(repoPath) {
  const candidates = [repoPath, path.join(repoPath, "vault")];

  for (const candidate of candidates) {
    if (await exists(path.join(candidate, "10-tasks"))) {
      return candidate;
    }
  }

  throw new Error(`Could not find a vault root under ${repoPath}`);
}

function asString(value) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return "";
}

function asStringArray(value) {
  return Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : [];
}

function parseTask(filePath, vaultRoot, raw) {
  const { data } = matter(raw);
  if (data.note_type !== "task") {
    return null;
  }

  return {
    title: asString(data.title),
    status: asString(data.status),
    visibility: asString(data.visibility),
    focus: asStringArray(data.focus),
    reviewWeek: asString(data.review_week),
    reviewMonth: asString(data.review_month),
    urgency: Number(data.urgency ?? 0),
    importance: Number(data.importance ?? 0),
    relativePath: path.relative(vaultRoot, filePath).replaceAll(path.sep, "/"),
  };
}

async function loadTasks(repoPath) {
  const vaultRoot = await resolveVaultRoot(repoPath);
  const files = await walk(path.join(vaultRoot, "10-tasks"));
  const tasks = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf8");
    const task = parseTask(filePath, vaultRoot, raw);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

function getTokyoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour,
    minute: parts.minute,
  };
}

function getIsoWeekParts(year, month, day) {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayOfWeek);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);

  return {
    isoYear,
    week: String(week).padStart(2, "0"),
  };
}

function sortTasks(tasks) {
  return [...tasks].sort((left, right) => {
    if (right.importance !== left.importance) {
      return right.importance - left.importance;
    }

    if (right.urgency !== left.urgency) {
      return right.urgency - left.urgency;
    }

    return left.title.localeCompare(right.title);
  });
}

function renderTaskList(tasks) {
  if (tasks.length === 0) {
    return ["- None"];
  }

  return sortTasks(tasks).map((task) => `- ${task.title} \`${task.relativePath}\``);
}

const publicTasks = await loadTasks(publicVaultRepoPath);
const privateTasks = await loadTasks(privateVaultRepoPath);
const allTasks = [...publicTasks, ...privateTasks];

const now = getTokyoDateParts();
const isoWeek = getIsoWeekParts(now.year, now.month, now.day);
const currentWeek = `${isoWeek.isoYear}-W${isoWeek.week}`;
const currentMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
const generatedAt = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")} ${now.hour}:${now.minute} JST`;

const activeLike = (task) => task.status !== "done";
const weeklyPublicFocus = publicTasks.filter(
  (task) => activeLike(task) && task.focus.includes("weekly") && task.reviewWeek === currentWeek,
);
const monthlyPublicFocus = publicTasks.filter(
  (task) => activeLike(task) && task.focus.includes("monthly") && task.reviewMonth === currentMonth,
);
const weeklyPrivateFocusCount = privateTasks.filter(
  (task) => activeLike(task) && task.focus.includes("weekly") && task.reviewWeek === currentWeek,
).length;
const monthlyPrivateFocusCount = privateTasks.filter(
  (task) => activeLike(task) && task.focus.includes("monthly") && task.reviewMonth === currentMonth,
).length;

const summary = `# Taskgraph Summary

Generated at ${generatedAt}.

This file is generated automatically every 3 hours from the taskgraph repositories.

## Counts

- Total tasks: ${allTasks.length}
- Public tasks: ${publicTasks.filter((task) => task.visibility === "public").length}
- Private tasks: ${privateTasks.filter((task) => task.visibility === "private").length}

## Current focus

### Weekly focus (${currentWeek})

Public focus tasks:
${renderTaskList(weeklyPublicFocus).join("\n")}

Private focus tasks:
- ${weeklyPrivateFocusCount} private task(s) are currently in weekly focus.

### Monthly focus (${currentMonth})

Public focus tasks:
${renderTaskList(monthlyPublicFocus).join("\n")}

Private focus tasks:
- ${monthlyPrivateFocusCount} private task(s) are currently in monthly focus.
`;

await writeFile(outputPath, `${summary}\n`, "utf8");
console.log(`Wrote summary to ${path.relative(repoRoot, outputPath)}`);
