# System Architecture

## 1. High-Level System Architecture
This diagram outlines the overall infrastructure, showing the separation between the client applications, the backend server, and the cloud database.

```mermaid
flowchart LR
    %% External Entities
    Client[Web Clients: Admin & Player]

    %% Application Server
    subgraph AppServer [Flask Application Layer]
        Router{Web Server}
        REST[REST API Endpoints]
        WSS[Socket.IO Server]
        JWT[JWT Validator]
    end

    %% Database
    MongoDB[(MongoDB Atlas)]

    %% Connections
    Client -->|HTTP / WS| Router
    
    Router -->|REST Requests| REST
    Router -->|WebSocket Events| WSS
    
    REST -.->|Check Auth| JWT
    WSS -.->|Check Auth| JWT
    
    REST -->|CRUD Operations| MongoDB
    WSS -->|Live Game State| MongoDB

    %% Vibrant Styling
    classDef client fill:#F43F5E,stroke:#fff,stroke-width:2px,color:white;
    classDef server fill:#3B82F6,stroke:#fff,stroke-width:2px,color:white;
    classDef auth fill:#F59E0B,stroke:#fff,stroke-width:2px,color:white;
    classDef db fill:#10B981,stroke:#fff,stroke-width:2px,color:white;
    
    class Client client;
    class Router,REST,WSS server;
    class JWT auth;
    class MongoDB db;
```

## 2. Real-Time Game Flow (Socket.IO)
This flowchart breaks down the live quiz session loop. By using a flowchart instead of a sequence diagram, the logic is much cleaner and less cluttered!

```mermaid
flowchart TD
    %% Nodes
    Start((Host Starts Game))
    CreateDB[(Create Session in DB)]
    WaitPlayers[Players Join via PIN]
    
    Trigger{Host clicks Start?}
    
    PushQ[Broadcast Question]
    Answer[Players Submit Answers]
    ScoreDB[(Update Scores in DB)]
    
    MoreQ{More Questions?}
    
    Leaderboard[Broadcast Leaderboard]
    Finish(((Game Finished)))

    %% Flow
    Start --> CreateDB
    CreateDB --> WaitPlayers
    WaitPlayers --> Trigger
    
    Trigger -- Yes --> PushQ
    Trigger -- No --> WaitPlayers
    
    PushQ --> Answer
    Answer --> ScoreDB
    ScoreDB --> MoreQ
    
    MoreQ -- Yes --> PushQ
    MoreQ -- No --> Leaderboard
    Leaderboard --> Finish

    %% Vibrant Styling
    classDef startend fill:#8B5CF6,stroke:#fff,stroke-width:2px,color:white;
    classDef action fill:#0EA5E9,stroke:#fff,stroke-width:2px,color:white;
    classDef db fill:#10B981,stroke:#fff,stroke-width:2px,color:white;
    classDef decision fill:#F59E0B,stroke:#fff,stroke-width:2px,color:white;
    
    class Start,Finish startend;
    class WaitPlayers,PushQ,Answer,Leaderboard action;
    class CreateDB,ScoreDB db;
    class Trigger,MoreQ decision;
```

## 3. Internal Application Architecture
This diagram breaks down the internal Python Blueprints and how they handle routing and business logic before interacting with the database.

```mermaid
flowchart TD
    %% Entry Point
    Entry((app.py))
    
    %% Blueprints
    subgraph Blueprints [Flask Blueprints]
        direction TB
        AuthBP[auth_bp]
        QuizBP[quiz_bp]
        LiveBP[live_bp]
    end
    
    %% Models
    subgraph Models [Data Models]
        UserModel[user.py]
        QuizModel[quiz.py]
    end
    
    %% Database Connection
    DBConn((database/db.py))
    MongoCloud[(MongoDB Atlas)]

    %% Routing
    Entry --> AuthBP
    Entry --> QuizBP
    Entry --> LiveBP
    
    %% Model Usage
    AuthBP -.->|Creates User| UserModel
    QuizBP -.->|Creates Quiz| QuizModel
    
    %% DB Access
    AuthBP --> DBConn
    QuizBP --> DBConn
    LiveBP --> DBConn
    DBConn --> MongoCloud

    %% Vibrant Styling
    classDef entry fill:#8B5CF6,stroke:#fff,stroke-width:2px,color:white;
    classDef bp fill:#F43F5E,stroke:#fff,stroke-width:2px,color:white;
    classDef model fill:#0EA5E9,stroke:#fff,stroke-width:2px,color:white;
    classDef db fill:#10B981,stroke:#fff,stroke-width:2px,color:white;
    
    class Entry entry;
    class AuthBP,QuizBP,LiveBP bp;
    class UserModel,QuizModel model;
    class MongoCloud,DBConn db;
```
