import { env } from '../../packages/config/src/index';

console.log('🔍 Execution: S1 Validation Test');
try {
    // Parsing is internal to the import, but we can verify values
    if (env.DATABASE_URL && env.JWT_SECRET.length >= 32) {
        console.log('✅ S1: Environment validated successfully');
    } else {
        throw new Error('S1: Validation logic failed');
    }
} catch (e) {
    console.error('❌ S1 VIOLATION:', e);
    process.exit(1);
}
