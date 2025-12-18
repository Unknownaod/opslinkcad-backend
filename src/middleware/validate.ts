import type { RequestHandler } from "express";
import { ZodError, type ZodSchema } from "zod";
import { httpError } from "../middleware/errors.js";

export function validateBody(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    try { req.body = schema.parse(req.body); next(); }
    catch (e) {
      if (e instanceof ZodError) next(httpError(400, "Invalid request", "validation"));
      else next(e);
    }
  };
}