// https://stackoverflow.com/questions/52177631/jest-timer-and-promise-dont-work-well-settimeout-and-async-function
// https://github.com/facebook/jest/issues/2157
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));
