export interface User {
    id: number;
}

export interface Permissions {
    canEdit: boolean;
}

export type AdminUser = User & Permissions;

export type UnusedType = string;