const NodeEnvironment = require('jest-environment-node').default;

class CustomEnvironment extends NodeEnvironment {
    async setup() {
        await super.setup();

        // Scrub problematic Bun globals from the VM context
        const problematicGlobals = [
            'ReadableStreamBYOBReader',
            'ReadableStreamDefaultReader',
            'WritableStreamDefaultWriter',
            'ReadableStream',
            'WritableStream',
            'TransformStream',
            'Headers',
            'Request',
            'Response',
            'fetch'
        ];

        for (const key of problematicGlobals) {
            if (this.global[key]) {
                try {
                    delete this.global[key];
                } catch (e) {
                    // If delete fails, try defining as undefined
                    Object.defineProperty(this.global, key, {
                        value: undefined,
                        configurable: true,
                        writable: true
                    });
                }
            }
        }
    }
}

module.exports = CustomEnvironment;
