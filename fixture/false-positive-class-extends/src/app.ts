import { User } from "./types.js";

class Admin extends User {
    role = "admin";
}

const admin = new Admin();

console.log(admin);