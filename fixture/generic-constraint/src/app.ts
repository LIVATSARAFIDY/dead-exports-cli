import type { User } from "./types.js";

interface AdminUser {
    id: number;
    role: string;
}

const user: User<AdminUser> = {
    data: {
        id: 1,
        role: "admin",
    },
};

console.log(user);