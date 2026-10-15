import mongoose from "mongoose";
import { HttpError } from "../../../shared/http-error.js";

export function requireAdmin(users) {
  return async (req, res, next) => {
    try {
      const userId = req.auth?.userId;

      if (!mongoose.isObjectIdOrHexString(userId)) {
        throw new HttpError(401, "Authentication required.");
      }

      const user = await users.findById(userId);

      if (!user) {
        throw new HttpError(401, "Authentication required.");
      }

      if (user.role !== "SYSTEM_ADMIN" || req.auth.role !== "SYSTEM_ADMIN") {
        throw new HttpError(403, "System Administrator access required.");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
