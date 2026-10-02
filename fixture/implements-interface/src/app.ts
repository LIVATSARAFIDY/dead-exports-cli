import type { User } from "./types.js";

class Admin implements User {
    id = 1;
}

const admin = new Admin();

console.log(admin);