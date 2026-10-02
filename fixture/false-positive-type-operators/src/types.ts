export interface User {
    id: number;
    name: string;
}

export type UserKeys = keyof User;

export type UserConstructor = typeof UserClass;

export class UserClass {
    id = 1;
}

export interface UnusedInterface {
    name: string;
}