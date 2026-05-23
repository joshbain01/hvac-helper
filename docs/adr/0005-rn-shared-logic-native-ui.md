# 5. RN Shared Logic + Native UI

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-engineering-mobile-app-builder` (Mobile App Builder) + `@agency-engineering-software-architect` (Software Architect)  

## Context

We need to build mobile applications for iOS and Android that connect to the physical hardware over BLE, manage local database states, handle offline queueing (Outbox), process OCR scans of equipment tags, and render a premium, responsive UI. We must balance development efficiency (sharing logic) with native UX excellence and low-level BLE/system access.

## Decision

We will implement a hybrid architecture: use **Native SwiftUI** (iOS 15+) and **Jetpack Compose** (Android API 24+) for the presentation layer, while sharing all non-UI business logic (BLE packet queueing, offline sync state machine, Outbox storage, and CRM integration API clients) via a shared **React Native (JS Engine)** core embedded in the native applications.

- **Direct Native On-Device LLM Access**: Local model inference (via Apple's native local language models and Android's AICore) and RAG queries (via native SQLite FTS5 searches) will execute directly within the native host wrappers (Swift/Kotlin). The React Native JavaScript thread is bypassed during inference to prevent bridge serialization congestion and main thread blocking.
- **Bridge Contracts**: Once the native layer completes local notes expansion, OCR structuring, or RAG manual lookups, it passes the structured JSON result across the bridge to the React Native shared layer, which handles the transaction validation and Outbox persistence.

## Hard Questions (5-Year Operator Perspective)

### Mobile App Builder Perspective

> [!WARNING]
> **1. Bridge Serialization Overhead and Latency:** Passing raw BLE byte arrays or large structured JSON results back and forth across the bridge requires continuous serialization. By isolating the heavy LLM token loading and FTS5 search inside native memory and passing only the final structured outputs to the JS Outbox, we minimize bridge traffic, ensuring we meet our 3-second transmission latency target.
> 
> **2. Native Tooling Upgrade Friction (Build Fatigue):** React Native projects are notorious for build breaks when Android Gradle or CocoaPods/Xcode update. By layering native SwiftUI/Compose modules on top of a React Native bridge and embedding platform-specific local model frameworks, we create a complex build system. In 5 years, we must maintain strict native platform dependencies for AI capabilities.
> 
> **3. Hiring and Skill Set Silos:** To maintain this codebase, a developer must be fluent in Swift/SwiftUI, Kotlin/Compose, and TypeScript/React Native. Finding engineers with this cross-functional expertise is difficult. Will this lead to isolated code silos and slower feature delivery?

### Software Architect Perspective

> [!WARNING]
> **4. Thread Isolation for BLE and Inference:** React Native executes JS on a single background thread. If the JS thread is busy with API synchronization or database operations, it cannot block BLE packet capture or on-device model execution, because BLE and local LLM processing run on separate native platform threads.
> 
> **5. Redundant State Management:** Having SwiftUI MVVM on iOS, Compose MVI on Android, and a React Native state container (e.g., Redux/Zustand) means data flows through multiple state stores. Local SQLite FTS5 indices will be managed natively, while transactional snapshot data will flow from native sensors to the JS state engine. We must enforce unidirectional data flows to prevent race conditions.

## Alternatives Considered

- **Full React Native (UI + Logic)**: Single codebase for UI and logic. Faster to build but compromises on native platform features (e.g., Apple Vision/ML Kit deep integrations, widgets, background worker APIs) and struggles to deliver a premium, native feel.
- **Kotlin Multiplatform (KMP)**: Sharing business logic in Kotlin while writing SwiftUI/Compose UIs. Highly performant and eliminates the JS bridge, but the library ecosystem in 2026 for KMP BLE managers and background sync wrappers is less mature than React Native's.
- **Pure Native (Dual Codebases)**: Writing separate Swift and Kotlin codebases. Delivers maximum performance and reliability but doubles the maintenance of complex synchronization rules, API payloads, and Outbox database layers.

## Cost of Being Wrong

If this hybrid architecture creates blocking issues:
- **Rewrite of the Shared Layer**: Replacing the RN engine with KMP or duplicate native wrappers would take 4 to 6 months of development time, freezing feature rollouts.
- **Degraded App Performance**: If bridge latency degrades BLE performance, we will face high field abandonment and negative app store ratings.
- **Development Stagnation**: Build tool incompatibility will force engineers to spend their time debugging build configurations rather than shipping product features.
