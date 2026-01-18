"""Database operations for session and article management."""
import json
import os
import uuid
import asyncpg
from dotenv import load_dotenv

load_dotenv()

# Database connection pool
db_pool: asyncpg.Pool | None = None


async def init_db():
    """Initialize database connection pool and create tables."""
    global db_pool
    db_pool = await asyncpg.create_pool(os.getenv("DATABASE_URL"))
    
    async with db_pool.acquire() as conn:
        # Create sessions table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id UUID PRIMARY KEY,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # Create articles table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                data JSONB NOT NULL,
                UNIQUE(session_id, url)
            )
        """)
        
        # Create index for faster lookups
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_articles_session_url 
            ON articles(session_id, url)
        """)


async def close_db():
    """Close database connection pool."""
    global db_pool
    if db_pool:
        await db_pool.close()


async def create_session() -> str:
    """Create a new session in the database."""
    session_id = str(uuid.uuid4())
    async with db_pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO sessions (session_id) VALUES ($1)",
            uuid.UUID(session_id)
        )
    return session_id


async def session_exists(session_id: str) -> bool:
    """Check if a session exists in the database."""
    async with db_pool.acquire() as conn:
        result = await conn.fetchval(
            "SELECT 1 FROM sessions WHERE session_id = $1",
            uuid.UUID(session_id)
        )
        return result is not None


async def store_article(session_id: str, url: str, article_data: dict):
    """Store an article in the database."""
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO articles (session_id, url, data)
            VALUES ($1, $2, $3)
            ON CONFLICT (session_id, url) DO UPDATE SET data = $3
            """,
            uuid.UUID(session_id),
            url,
            json.dumps(article_data)
        )


async def store_articles_batch(session_id: str, articles: list[tuple[str, dict]]):
    """Store multiple articles in the database efficiently."""
    async with db_pool.acquire() as conn:
        await conn.executemany(
            """
            INSERT INTO articles (session_id, url, data)
            VALUES ($1, $2, $3)
            ON CONFLICT (session_id, url) DO UPDATE SET data = $3
            """,
            [(uuid.UUID(session_id), url, json.dumps(data)) for url, data in articles]
        )


async def get_article(session_id: str, url: str) -> dict | None:
    """Retrieve an article from the database."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT data FROM articles WHERE session_id = $1 AND url = $2",
            uuid.UUID(session_id),
            url
        )
        if row:
            return json.loads(row["data"])
        return None


async def get_all_articles(session_id: str) -> list[dict]:
    """Retrieve all articles for a session."""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT data FROM articles WHERE session_id = $1",
            uuid.UUID(session_id)
        )
        return [json.loads(row["data"]) for row in rows]
