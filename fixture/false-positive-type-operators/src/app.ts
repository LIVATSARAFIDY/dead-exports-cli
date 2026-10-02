import type {
    UserKeys,
    UserConstructor,
} from "./types.js";

const key: UserKeys = "id";

const constructor: UserConstructor = class {
    id = 1;
};

console.log(key, constructor);