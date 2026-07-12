import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, String, Integer, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    custom_instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=True)
    starred = Column(Boolean, default=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    share_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"))
    role = Column(String)
    content = Column(Text)
    citations = Column(JSON, nullable=True)
    parent_message_id = Column(String, ForeignKey("messages.id"), nullable=True)
    branch_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class File(Base):
    __tablename__ = "files"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True)
    filename = Column(String)
    mime_type = Column(String)
    content_hash = Column(String)
    status = Column(String)  # uploading, processing, ready, error
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    size_bytes = Column(Integer)


class FileChunkMeta(Base):
    __tablename__ = "file_chunks_meta"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String, ForeignKey("files.id"))
    chunk_index = Column(Integer)
    page = Column(Integer, nullable=True)
    char_start = Column(Integer)
    char_end = Column(Integer)


class Artifact(Base):
    __tablename__ = "artifacts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"))
    message_id = Column(String, ForeignKey("messages.id"), nullable=True)
    title = Column(String)
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ArtifactVersion(Base):
    __tablename__ = "artifact_versions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    artifact_id = Column(String, ForeignKey("artifacts.id"))
    content = Column(Text)
    language = Column(String)
    version_number = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConnectorToken(Base):
    __tablename__ = "connector_tokens"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_id = Column(String)
    access_token = Column(String)
    refresh_token = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
