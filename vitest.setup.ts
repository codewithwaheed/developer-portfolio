import '@testing-library/jest-dom/vitest';
import { MotionGlobalConfig } from 'motion/react';

// Finish Motion animations instantly so tests see final states.
MotionGlobalConfig.skipAnimations = true;
