# Product

## Register

product

## Users

Threadport is maintained by the library author, with examples and harnesses used to validate behavior before app developers integrate the headless primitives. The maintainer is tuning scroll physics, virtualization behavior, API contracts, and example ergonomics for chat-style interfaces.

## Product Purpose

Threadport provides headless virtualized chat viewport primitives for React. It exists to make ChatGPT and Claude-style transcript behavior reliable while leaving messages, chrome, composer controls, styling, and layout to the integrating application.

## Brand Personality

Precise, quiet, current. The implementation should feel technical and minimal, with examples that read as 2026 clean without becoming sterile.

## Anti-references

Avoid utility-class soup as an aesthetic, Tailwind-default visual patterns, generic SaaS gloss, ornamental gradients, and busy component chrome that distracts from scroll behavior.

## Design Principles

- Behavior is the product: make scroll anchoring, tail behavior, and imperative controls visibly dependable.
- Headless means restraint: examples demonstrate integration points without pretending to be a full chat product.
- Minimal is not empty: use clear hierarchy, deliberate spacing, and small moments of polish where they clarify behavior.
- Preserve integrator control: avoid decisions that make styling, accessibility semantics, or composition harder downstream.

## Accessibility & Inclusion

Respect reduced motion. Core primitives should expose sensible hooks and semantics, while final accessibility responsibility largely belongs to the integrating application.
