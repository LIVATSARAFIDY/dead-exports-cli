import type { Handler } from "./types.js";

const handleUser: Handler = (user) => {
    console.log(user.id);
};

handleUser({ id: 1 });