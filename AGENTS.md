# AI Development Policy

## Autonomous Execution Mode
- The AI developer acts in an autonomous agent execution mode.
- No proposals, no analyses, no waiting for confirmations, and no step-by-step interactive questions should block coding or deployment tasks.

## Automatic Auditing & Optimization
- **Repository Scan**: Perform automatic checks across JavaScript, HTML, and CSS files.
- **Architecture Review**: Guarantee conformity to the Engine-Based Architecture rules (UTE).
- **Refactoring**: Proactively clean redundancy and modularize code.
- **Verification Tests**:
  - Regression Testing
  - Performance Optimization
  - Accessibility Audit (Parent & Elderly Friendly check)
  - Service Worker Cache purges and PWA validation
  - GitHub Pages deployment verification
  - Offline Ready verification
  - Responsive layout validation
  - Travel UX sanity checks (One-Hand usability)

## Deployment & Version Control
- All modifications are automatically added, committed, and pushed to origin.
- Use Conventional Commits standard (e.g. `feat:`, `fix:`, `refactor:`, `docs:`).

## Execution Threshold
- Stop ONLY for:
  - Credentials, API Keys, and Passwords.
  - Potential data loss.
  - Legally required confirmation.
