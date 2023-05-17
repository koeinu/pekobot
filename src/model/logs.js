import { loadFile, saveFile } from "../utils/fileUtils.js";
import { originalConsoleError } from "../telegramLogger.js";

export const ERRORS_FILENAME = "logs_error.json";
export const LOGS_FILENAME = "logs_log.json";
export const WARNINGS_FILENAME = "logs_warning.json";
export const DEBUGS_FILENAME = "logs_debug.json";
const INITIAL_FILE = [];

const formatLog = (...args) => {
  return `${new Date().toString()}: ${args
    .map((el) => JSON.stringify(el))
    .join(", ")}`;
};

export const writeError = (...args) => {
  let file = loadFile(ERRORS_FILENAME) || INITIAL_FILE;
  file.push(formatLog(...args));
  try {
    saveFile(ERRORS_FILENAME, file);
  } catch (e) {
    originalConsoleError(e);
  }
};

export const writeDebug = (...args) => {
  let file = loadFile(DEBUGS_FILENAME) || INITIAL_FILE;
  file.push(formatLog(...args));
  try {
    saveFile(DEBUGS_FILENAME, file);
  } catch (e) {
    originalConsoleError(e);
  }
};

// throws IO error
export const writeLog = (...args) => {
  let file = loadFile(LOGS_FILENAME) || INITIAL_FILE;
  file.push(formatLog(...args));
  try {
    saveFile(LOGS_FILENAME, file);
  } catch (e) {
    originalConsoleError(e);
  }
};

// throws IO error
export const writeWarning = (...args) => {
  let file = loadFile(WARNINGS_FILENAME) || INITIAL_FILE;
  file.push(formatLog(...args));
  try {
    saveFile(WARNINGS_FILENAME, file);
  } catch (e) {
    originalConsoleError(e);
  }
};

export const createLogsRoute = (filename) => {
  const logs = loadFile(filename) || INITIAL_FILE;
  const route = (req, res) => {
    const body = `
<!DOCTYPE html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
${logs.map((el) => JSON.stringify(el)).join("<br>")}
</body>
</html>
`;

    res.writeHead(200, "ok", { "content-type": "text/html" });
    res.end(body);
  };
  return route;
};
