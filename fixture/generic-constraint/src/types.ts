export interface BaseUser {
    id: number;
}

export interface User<T extends BaseUser> {
    data: T;
}

export interface UnusedInterface {
    name: string;
}