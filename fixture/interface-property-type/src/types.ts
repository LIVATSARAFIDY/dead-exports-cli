export interface User {
    id: number;
}

export interface Admin {
    user: User;
}

export interface UnusedInterface {
    name: string;
}