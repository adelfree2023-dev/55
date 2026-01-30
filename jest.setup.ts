if (typeof ReadableStreamBYOBReader !== 'undefined') {
    try { delete (global as any).ReadableStreamBYOBReader; } catch (e) { }
}
if (typeof ReadableStreamDefaultReader !== 'undefined') {
    try { delete (global as any).ReadableStreamDefaultReader; } catch (e) { }
}
if (typeof WritableStreamDefaultWriter !== 'undefined') {
    try { delete (global as any).WritableStreamDefaultWriter; } catch (e) { }
}
if (typeof ReadableStream !== 'undefined') {
    try { delete (global as any).ReadableStream; } catch (e) { }
}
if (typeof WritableStream !== 'undefined') {
    try { delete (global as any).WritableStream; } catch (e) { }
}
if (typeof TransformStream !== 'undefined') {
    try { delete (global as any).TransformStream; } catch (e) { }
}
