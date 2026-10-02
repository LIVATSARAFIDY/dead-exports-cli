export interface User {
    id: number;
}

export interface Admin extends User {
    permissions: string[];
}

export interface UnusedInterface {
    name: string;
}

export type UserId = number;

export type AdminId = UserId;

export type UnusedType = string;