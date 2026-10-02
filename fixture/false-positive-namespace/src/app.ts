import * as Types from "./types.js";

const user: Types.User = {
    id: 1,
};

const userId: Types.UserId = user.id;

console.log(user, userId);