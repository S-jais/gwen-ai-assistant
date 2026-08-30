from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config.settings import settings
from app.database.models import Base

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for table_name in ("conversations", "tasks", "documents", "memories"):
            columns = await conn.execute(text(f"PRAGMA table_info({table_name})"))
            column_names = {row[1] for row in columns.fetchall()}
            if "user_id" not in column_names:
                await conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN user_id VARCHAR(36)"))
            await conn.execute(text(
                f"CREATE INDEX IF NOT EXISTS ix_{table_name}_user_id ON {table_name} (user_id)"
            ))


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
