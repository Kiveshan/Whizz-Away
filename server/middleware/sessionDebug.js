const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method !== "OPTIONS") {
    console.log(
      "Headers:",
      JSON.stringify(
        {
          "content-type": req.headers["content-type"],
          authorization: req.headers.authorization
            ? "Bearer [REDACTED]"
            : "none",
        },
        null,
        2
      )
    );
  }
  next();
};

const sessionDebugger = (req, res, next) => {
  console.log("Session Middleware Check:");
  console.log("- Session ID:", req.session.id);
  console.log("- Session Cookie:", req.headers.cookie);
  console.log("- Session User:", req.session.user);
  next();
};

export { requestLogger, sessionDebugger };
