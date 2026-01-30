const NodeEnvironment = require('jest-environment-node').default;

class CustomEnvironment extends NodeEnvironment {
    constructor(config, context) {
        // Attempt to scrub the problematic Bun globals before Jest tries to "protect" them
        const problematicGlobals = [
            'ReadableStreamBYOBReader',
            'ReadableStreamDefaultReader',
            'WritableStreamDefaultWriter',
            'ReadableStream',
            'WritableStream',
            'TransformStream'
        ];

        for (const key of problematicGlobals) {
            if (global[key]) {
                try {
                    // Setting to undefined or deleting to avoid the getter-without-this error
                    Object.defineProperty(global, key, {
                        get() { return undefined; },
                        configurable: true
                    });
                } catch (e) { }
            }
        }

        super(config, context);
    }
}

module.exports = CustomEnvironment;
