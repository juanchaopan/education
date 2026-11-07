## Summary

- Route `/change` with an attached lesson PDF to per-problem implementation, cold-start browser review, and fix-and-record iteration.
- Require continuous audiovisual evidence, timestamped learner-perspective observations, and quick, slow, and mistaken input checks.
- Add a Chromium/FFmpeg helper for local video and browser audio recording.

Refs #48. Sample materials and recordings are local and outside this PR.

## Verification

- Prettier, oxlint, and git diff --check
- Browser smoke recording through the repository helper, with video and audible audio streams
- Separate local pencil run with six linked red pairs, fast/slow drags, incorrect input, and correct final count

