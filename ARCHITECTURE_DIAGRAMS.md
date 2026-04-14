# Data Flow Diagram

```mermaid
flowchart LR
    subgraph Client
        UI[React UI]
        ST[Zustand Stores]
        SK[Socket Client]
    end

    subgraph Server
        RT[Express Routes]
        CT[Controllers]
        AU[Auth Middleware]
        SOC[Socket.IO Layer]
        META[Meta AI Module]
    end

    subgraph DataStores
        MDB[(MongoDB)]
        CLO[(Cloudinary)]
        VDB[(Pinecone)]
    end

    subgraph External
        GOOG[Google OAuth]
        LLMX[LLM API]
    end

    UI -->|HTTP Request| RT
    RT --> AU
    AU --> CT
    CT -->|Read/Write Users, Conversations, Messages, Groups| MDB
    CT -->|Upload Images| CLO

    UI --> ST
    ST -->|Socket Connect + Events| SK
    SK <--> SOC

    CT -->|Emit Events| SOC
    SOC -->|Online Users, New Message, Group Updates| SK

    CT -->|Detect @meta/@meta_pro| META
    META -->|Build Prompt from recent context| MDB
    META -->|Completion Request| LLMX
    META -->|Vector Query for @meta_pro| VDB
    CT -->|Store embeddings| VDB
    META -->|AI Reply| CT

    UI -->|Google Sign-In Start| RT
    RT -->|OAuth Redirect| GOOG
    GOOG -->|Callback with profile| RT
    CT -->|Issue JWT Cookie| UI
```

## Notes

- `@meta` uses recent conversation/group context from MongoDB.
- `@meta_pro` uses the same context plus Pinecone vector retrieval.
- AI replies are persisted as normal messages and delivered through Socket.IO.
- Google OAuth callback finalizes login by issuing the same JWT cookie strategy used by regular login.
