
const Queue = require('tinyqueue');
console.log('Type of Queue:', typeof Queue);
console.log('Queue content:', Queue);
try {
    const q = new Queue();
    console.log('Success: Queue is a constructor');
} catch (e) {
    console.log('Error instantiating Queue:', e.message);
    if (Queue.default) {
        console.log('Queue.default exists. Type:', typeof Queue.default);
        try {
            const q2 = new Queue.default();
            console.log('Success: Queue.default is a constructor');
        } catch (e2) {
            console.log('Error instantiating Queue.default:', e2.message);
        }
    }
}
