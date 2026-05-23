# 6. LLM Hosting (On-Device Primary with Cloud Fallback)

**Status**: Accepted  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-engineering-ai-engineer` (AI Engineer) + `@agency-compliance-auditor` (Compliance Auditor)  

## Context

Technicians dictate work notes, type shorthand descriptions, and query equipment manuals. To turn these inputs into structured service records, auto-itemize consumables, and perform manuals troubleshooting, we need an LLM. We must choose whether to execute this language processing locally on the technician's mobile device or send it to a cloud LLM endpoint.

## Decision

We will use **On-Device LLM Processing and Localized RAG** as the primary path on Apple and Android clients.
- **On-Device Models**: The mobile application utilizes hardware-accelerated native system language models (such as Apple's local models on iOS and Android's built-in AICore on Android) to perform notes expansion and structured translation.
- **On-Device RAG**: Service manuals are compressed and indexed locally in the application bundle using an on-device SQLite database with the virtual full-text search engine (**FTS5**). RAG queries are processed by retrieving context passages from the local index and feeding them directly to the local model, ensuring 100% offline capability and zero cloud service fees.
- **Backend Gateway Fallback**: We maintain a server API proxy routing to secure cloud LLM endpoints. This backend proxy serves as a fallback for legacy devices that do not support hardware-accelerated local models. Access to this cloud-based LLM fallback is gated behind the paid **Teams SaaS subscription ($19.00/user/month)**. Free-tier users must have a device supporting native local models to use AI features.
- **Zero Data Retention**: The backend fallback gateway enforces enterprise agreements with **Zero Data Retention (ZDR)**.

## Hard Questions (5-Year Operator Perspective)

### AI Engineer Perspective

> [!TIP]
> **1. Battery and Resource Constraints**: Running on-device inference can be intensive. By relying on native system APIs (AICore / Apple Intelligence frameworks), the operating system handles task scheduling, memory sharing, and neural processor optimization. This keeps battery consumption within acceptable parameters compared to running custom raw models.
> 
> **2. Offline Capabilities**: Because both the database index (SQLite FTS5) and the model reside on-device, technicians have full diagnostic search and notes translation capabilities inside remote basements or rural locations without cellular coverage.
> 
> **3. Fallback Complexity**: We must maintain dual prompt templates—one optimized for resource-constrained on-device models and another for large cloud fallback models. A testing harness must run schema validations on both outputs to ensure consistent JSON formats.

### Compliance Auditor Perspective

> [!TIP]
> **4. Privacy Boundaries**: Local execution guarantees that sensitive client data (e.g. keycodes, names, or addresses discussed in notes) never leaves the technician's device, significantly lowering CCPA/CPRA exposure.
> 
> **5. Auditability of Cloud Fallbacks**: For the subset of legacy devices using cloud fallbacks, the Backend Gateway provides a single point of audit, allowing us to inspect, log, and confirm that Zero Data Retention headers are enforced.

## Alternatives Considered

- **100% Cloud Hosting**: Eased initial development but introduced substantial lifetime token costs, required constant internet connectivity, and exposed the business to cloud vendor deprecation cycles.
- **Client-Side Vector Databases**: Running on-device vector embedding databases (e.g., local vector libraries). Rejected due to binary size overhead and database setup complexity on mobile. A text-based SQLite FTS5 index provides sufficient precision for document lookup at a fraction of the size.

## Cost of Being Wrong

If on-device capabilities prove insufficient for complex diagnostic reasoning:
- **Migration to Cloud Baseline**: We would need to route more queries to the Backend Gateway fallback API. While this requires no app changes, it would increase recurring operating costs, shifting the unit economics from the low-cost tier toward cloud-hosted tiers.
