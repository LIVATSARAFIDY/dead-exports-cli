import type { Handler } from "./handlers.js";

const handleUser: Handler = (user) => {
    console.log(user.id);
};

handleUser({ id: 1 });