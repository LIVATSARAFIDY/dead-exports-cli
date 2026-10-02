function usedFunction() {
    return "used";
}

function unusedFunction() {
    return "unused";
}

console.log(
    "exports:",
    typeof usedFunction
);

export {
    usedFunction as publicFunction,
    unusedFunction as unusedPublicFunction,
};