export interface User {
    id: number;
}

export type Handler = (user: User) => void;

export type UnusedType = string;