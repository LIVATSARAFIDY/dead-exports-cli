import type { Admin, AdminId } from "./types.js";

const admin: Admin = {
    id: 1,
    permissions: ["read"],
};

const adminId: AdminId = 1;

console.log(admin, adminId);