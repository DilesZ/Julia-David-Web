const bcrypt = require('bcryptjs');

async function test() {
    try {
        console.log("Testing compare with null...");
        await bcrypt.compare("password", null);
    } catch (e) {
        console.log("Caught error:", e);
    }

    try {
        console.log("Testing compare with undefined...");
        await bcrypt.compare("password", undefined);
    } catch (e) {
        console.log("Caught error:", e);
    }
}

test();
