/**
 * Global test setup — with route-level code-splitting, lazy page chunks add
 * one async hop before assertions can resolve. Give async queries generous
 * headroom under parallel-worker contention (default was 1000ms).
 */
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 2500 });
