import type { User } from "./types.js";

export type Handler = (user: User) => void;

export type UnusedHandler = () => void;