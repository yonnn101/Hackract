// Mock Auth Middleware for Local Development
export const verifyAccessToken = (req, res, next) => {
  console.log("Skipping Auth0 verification (Mock Mode)");
  // Mock user payload
  req.auth = {
    payload: {
      sub: "auth0|mock-user-id",
      permissions: ["read:scans", "write:scans"]
    }
  };
  next();
};

export const Admin = (req, res, next) => {
  console.log("Skipping Admin verification (Mock Mode)");
  next();
};
