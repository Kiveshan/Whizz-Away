const secretKey = process.env.JWT_SECRET;
if (!secretKey) throw new Error("JWT_SECRET environment variable is required but not set.");

export { secretKey };
